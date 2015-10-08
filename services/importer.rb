require 'json'
require 'yaml'
require 'rake'

# Imports annotations and other evidence from the given directory into the
# system.
#
# Annotations in GFF files are formated to JB-JSON. BAM files are symlinked
# alongside JB-JSON and track metadata is recorded for them in trackList.json.
# Subsequently trackList.json is re-written in accordance with trackMeta.yaml.
#
# trackMeta.yaml provides a means to introduce new or update existing keys in
# trackList.json. In particular we use it to define the order in which tracks
# will be listed in the curation interface and to change track label.
#
# TODO
#   * Import incrementally. So that we don't have to reimport everything when
#     a new line of evidence is added.
#   * Don't import any annotations into Postgres and separate task creation
#     from import.
class Importer

  include FileUtils

  def initialize(inp_dir)
    @species, @asm_id = inp_dir.split('/')[-2..-1]
    @inp_dir = inp_dir
  end

  def run
    format and update_tracklist
    Genome.db.transaction do
      register_genome
      register_ref_seqs
      register_annotations
      create_curation_tasks
    end
  end

  attr_reader :inp_dir, :species, :asm_id

  attr_reader :genome

  def out_dir
    @out_dir ||= File.join('data', 'jbrowse', species, asm_id)
  end

  def track_list_file
    File.join(out_dir, 'trackList.json')
  end

  def track_meta_file
    File.join(inp_dir, 'trackMeta.yaml')
  end

  def track_list
    @track_list ||= JSON.load File.read track_list_file
  end

  def track_meta
    @track_meta ||= YAML.load File.read track_meta_file
  end

  # GFF -> JB JSON
  # BAM -> JB track list
  def format
    Dir["#{inp_dir}/*.gff"].each do |gff_file|
      sh "bin/gff2jbrowse.pl --out #{out_dir} #{gff_file}"
    end

    Dir["#{inp_dir}/*.bam"].each do |bam_file|
      bam_name = File.basename(bam_file, '.bam')

      # Symlink BAM & BAI.
      ln_sf "../../../../annotations/#{species}/#{asm_id}/#{bam_name}.bam",
        "#{out_dir}/tracks/#{bam_name}.bam"
      ln_sf "../../../../annotations/#{species}/#{asm_id}/#{bam_name}.bam.bai",
        "#{out_dir}/tracks/#{bam_name}.bam.bai"

      # Add alignment track.
      sh "bin/add-bam-track.pl --in #{track_list_file}"                        \
         " --label #{bam_name} --bam_url tracks/#{bam_name}.bam"

      # Add coverage track.
      sh "bin/add-bam-track.pl --in #{track_list_file} --coverage"             \
         " --label #{bam_name}_coverage --bam_url tracks/#{bam_name}.bam"      \
    end
  end

  # Register some metadata about the GFF file we are importing.
  def register_genome
    @genome = Genome.create species: species, asm_id: asm_id
  end

  # Bulk insert refseqs from given GFF file into Postgres.
  def register_ref_seqs
    ref_seqs_file = File.join(out_dir, 'seq', 'refSeqs.json')
    ref_seqs_json = JSON.load File.read ref_seqs_file

    ref_seqs = []
    ref_seqs_json.each do |ref_seq|
      ref_seqs << [genome.id, ref_seq['name'], ref_seq['length']]
    end
    RefSeq.import [:genome_id, :seq_id, :length], ref_seqs
  end

  # Bulk insert annotations from the MAKER track of the given GFF file into
  # Postgres.
  #
  # NOTE:
  #   We don't parse data from GFF file. We use formatted data from JBrowse
  #   instead.
  #
  #   Run `tree` in data/jbrowse/Solenopsis_invicta/Si_gnF/ after importing
  #   test data to get an idea of how JBrowse keeps data.
  def register_annotations
    values = []
    Dir[File.join(out_dir, 'tracks', 'maker', '*')].each do |ref|
        track_data = JSON.load File.read File.join(ref, 'trackData.json')
        values.concat nclist_to_features(ref,
                                         track_data['intervals']['classes'],
                                         track_data['intervals']['nclist'])
    end
    Feature.import [:ref_seq_id, :source, :name, :type, :start, :end, :strand, :subfeatures], values
  end

  # Rewrite `trackList.json` to suit our needs better.
  def update_tracklist
    tracks = track_list['tracks'].select { |track| track_meta[track['label']] }
    tracks.each do |track|
      meta = track_meta[track['label']]
      meta['order'] ||= tracks.length
      track.update meta
    end

    track_list['tracks'] = tracks
    File.write track_list_file, JSON.pretty_generate(track_list)
  end

  # Parse JB's NCList into an Array of Array.
  def nclist_to_features(ref, classes, nclist)
    list = []
    nclist.each do |e|
      c = Struct.new(*classes[e.first]['attributes'].map(&:intern))
      v = c.new(*e[1, c.members.length])
      if v.respond_to? :Chunk
        list.concat nclist_to_features(ref, classes, JSON.load(File.read File.join(ref, "lf-#{v.Chunk}.json")))
      else
        v.Subfeatures.each_with_index do |s, i|
          sc = Struct.new(*classes[s.first]['attributes'].map(&:intern))
          sv = sc.new(*s[1, c.members.length])
          sf = {
            name:   sv.Id,
            type:   sv.Type,
            start:  sv.Start,
            end:    sv.End,
            strand: sv.Strand
          }
          v.Subfeatures[i] = sf
        end
        list << [v.Seq_id, v.Source, v.Id, v.Type, v.Start, v.End, v.Strand, Sequel.pg_json(v.Subfeatures)]
      end
      if e.last.is_a? Hash
        list.concat nclist_to_features(ref, classes, e.last['Sublist'])
      end
    end
    list
  end

  # Create tasks clubbing overlapping mRNAs into one.
  def create_curation_tasks
    # Feature loci on all refs, sorted and grouped by ref.
    # [
    #   {
    #     ref: ...,
    #     ids: [],
    #     start_coordinates: [],
    #     end_coordinates: []
    #   },
    #   ...
    # ]
    loci_all_ref = genome.mRNAs.
      select(Sequel.function(:array_agg, Sequel.lit('"id" ORDER BY "start"')).as(:ids),
             Sequel.function(:array_agg, Sequel.lit('"name" ORDER BY "start"')).as(:names),
             Sequel.function(:array_agg, Sequel.lit('"end" ORDER BY "start"')).as(:end_coordinates),
             Sequel.function(:array_agg, Sequel.lit('"start" ORDER BY "start"')).as(:start_coordinates),
             :ref_seq_id).group(:ref_seq_id)

    loci_all_ref.each do |loci_one_ref|
      groups = call_overlaps loci_one_ref
      groups.each do |group|
        ids = group.delete :ids
        t = Task.create group
        t.difficulty = ids.length
        t.save
      end
    end
  end

  # Group overlapping loci together regardless of feature strand.
  #
  # About overlapping genes: http://www.biomedcentral.com/1471-2164/9/169.
  def call_overlaps(loci_one_ref)
    # Ref being processed.
    ref = loci_one_ref[:ref_seq_id]

    groups = [] # [{start: , end: , gene_ids: []}, ...]
    loci_one_ref[:ids].each_with_index do |id, i|
      start = loci_one_ref[:start_coordinates][i]
      _end  = loci_one_ref[:end_coordinates][i]
      name  = loci_one_ref[:names][i]

      if not groups.empty? and start < groups.last[:end] # overlap
        groups.last[:ids] << id
        groups.last[:meta][:names] << name
        groups.last[:end] = [groups.last[:end], _end].max
      else
        groups << {ref_seq_id: ref, start: start, end: _end, ids: [id], meta: {names: [name]}}
      end
    end
    groups
  end
end
