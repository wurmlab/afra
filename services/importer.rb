require 'json'

# Import annotations into the system from a GFF file.
class Importer

  def initialize(annotations_file)
    @annotations_file = annotations_file
    @species, @asm_id = annotations_file.split('/')[-2..-1]
    @asm_id.sub!(/(\.gff)$/, '')
  end

  def run
    format
    update_tracklist
    Genome.db.transaction do
      register_genome
      register_ref_seqs
      register_annotations
    end
  end

  attr_reader :annotations_file, :species, :asm_id, :genome

  # This is where JBrowse formatted data from the GFF file will go.
  def jb_store
    @jb_store ||= File.join('data', 'jbrowse', species, asm_id)
  end

  # This is where JBrowse will have written trackList.json after GFF has been
  # formatted.
  def track_list_file
    @track_list_file ||= File.join(jb_store, 'trackList.json')
  end

  # Contents of trackList.json.
  def track_list
    @track_list ||= JSON.load File.read track_list_file
  end

  # The order in which we will want tracks to be displayed.
  #
  # TODO: later on we could read this from a YAML file.
  def track_order
    @track_order ||= %w{DNA Edit maker augustus_masked snap_masked est_gff
      est2genome protein2genome blastn blastx tblastx
      repeatmasker}
  end

  # GFF -> JB JSON
  def format
    system "bin/gff2jbrowse.pl -o #{jb_store} '#{annotations_file}'"
  end

  # Register some metadata about the GFF file we are importing.
  def register_genome
    @genome = Genome.create species: species, asm_id: asm_id
  end

  # Bulk insert refseqs from given GFF file into Postgres.
  def register_ref_seqs
    ref_seqs_file = File.join(jb_store, 'seq', 'refSeqs.json')
    ref_seqs_json = JSON.load File.read ref_seqs_file

    ref_seqs = []
    ref_seqs_json.each do |ref_seq|
      ref_seqs << [genome.id, ref_seq['name'], ref_seq['length']]
    end
    RefSeq.import [:genome_id, :seq_id, :length], ref_seqs
  end

  # Bulk insert annotations from given GFF file into Postgres.
  def register_annotations
    values = []
    Dir[File.join(jb_store, 'tracks', '*')].each do |track|
      next if File.basename(track) == 'gene'
      Dir[File.join(track, '*')].each do |ref|
        track_data = JSON.load File.read File.join(ref, 'trackData.json')
        values.concat nclist_to_features(ref, track_data['intervals']['classes'], track_data['intervals']['nclist'])
      end
    end
    Feature.import [:start, :end, :strand, :source, :ref_seq_id, :name, :type, :subfeatures], values
  end

  # Rewrite track list to include order key.
  def update_tracklist
    track_list['tracks'].each do |track|
      order = track_order.index(track['label'])
      order = track_order.length unless order
      track['order'] = order
    end
    File.write track_list_file, JSON.pretty_generate(track_list)
  end

  # Parse JB's NCList.
  def nclist_to_features(ref, classes, nclist)
    list = []
    nclist.each do |e|
      if e.first == 0
        c = Struct.new(*classes[0]['attributes'].map(&:downcase).map(&:intern))
        v = c.new(*e[1, c.members.length])
        v.subfeatures.each_with_index do |s, i|
          sc = Struct.new(*classes[s.first]['attributes'].map(&:downcase).map(&:intern))
          sv = sc.new(*s[1, c.members.length])
          v.subfeatures[i] = sv.to_h
        end
        list << [v.start, v.end, v.strand, v.source, v.seq_id, v.name, v.type, Sequel.pg_json(v.subfeatures)]
      else
        list.concat nclist_to_features(ref, classes, JSON.load(File.read File.join(ref, "lf-#{e[3]}.json")))
      end
      if e.last.is_a? Hash
        list.concat nclist_to_features(ref, classes, e.last['Sublist'])
      end
    end
    list
  end
end
