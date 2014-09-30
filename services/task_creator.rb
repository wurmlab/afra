# Import annotations into the system from a GFF file.
class TaskCreator

  def initialize(annotations_file)
    species, asm_id = annotations_file.split('/')[-2..-1]
    asm_id.sub!(/(\.gff)$/, '')
    @genome = Genome.first(species: species, asm_id: asm_id)
  end

  def run
    puts "Creating tasks ..."
    Task.db.transaction do
      create_curation_tasks
    end
  end

  attr_reader :genome

  # mRNAs we are taking into account for task creation.
  def mRNAs
    Feature.
      where(type: 'mRNA').
      where(ref_seq_id: genome.ref_seqs.map(&:seq_id))
  end

  # Create tasks clubbing overlapping mRNAs into one.
  def create_curation_tasks
    # Feature loci on all refs, sorted and grouped by ref.
    # [
    #   {
    #     ref: ...,
    #     gene_ids: [],
    #     gene_start_coordinates: [],
    #     gene_end_coordinates: []
    #   },
    #   ...
    # ]
    loci_all_ref = mRNAs.
      select(Sequel.function(:array_agg, Sequel.lit('"id" ORDER BY "start"')).as(:gene_ids),
      Sequel.function(:array_agg, Sequel.lit('"start" ORDER BY "start"')).as(:gene_start_coordinates),
      Sequel.function(:array_agg, Sequel.lit('"end" ORDER BY "start"')).as(:gene_end_coordinates),
      :ref_seq_id).group(:ref_seq_id)

    loci_all_ref.each do |loci_one_ref|
      groups = call_overlaps loci_one_ref
      groups.each do |group|
        gene_ids = group.delete :gene_ids
        t = Task.create group
        t.difficulty = gene_ids.length
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
    loci_one_ref[:gene_ids].each_with_index do |gene_id, i|
      start = loci_one_ref[:gene_start_coordinates][i]
      _end  = loci_one_ref[:gene_end_coordinates][i]

      if not groups.empty? and start < groups.last[:end] # overlap
        groups.last[:gene_ids] << gene_id
        groups.last[:end] = [groups.last[:end], _end].max
      else
        groups << {ref_seq_id: ref, start: start, end: _end, gene_ids: [gene_id]}
      end
    end
    groups
  end
end
