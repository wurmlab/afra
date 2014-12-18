# This file creates a GFF3 file for all the annotation submissions
# corresponding to GFF file specified by the user. The GFF3 specification can
# be found on The Sequence Ontology Project's website [1]. To verify the
# generated GFF3 file use the online tool provided by genometools [2].
class Exporter

  BLACKLISTED_TYPES = %w(non_canonical_splice_site
                          non_canonical_translation_start_site
                          non_canonical_translation_stop_site)
  def initialize(annotations_file)
    @annotations_file = annotations_file
    species, asm_id = annotations_file.split('/')[-2..-1]
    asm_id.sub!(/(\.gff)$/, '')
    @genome = Genome.first species: species, asm_id: asm_id

    @subfeature_count = Hash.new(0)
  end

  attr_reader :genome

  # Returns all the submissions objects for a given GFF3 file.
  def submissions
    ref_seqs = @genome.ref_seqs.map(&:seq_id)
    task_ids = Task.where(ref_seq_id: ref_seqs).map(&:id)
    Submission.where task_id: task_ids
  end

  def run
    gff_data = []
    submissions.each do |submission|
      @subfeature_count['gene'] += 1
      # HACK:
      gene_line = []
      gene_line << feature_to_gff(submission.data['value'].first, 0, false, true)
      gff_data << gene_line

      submission.data['value'].each do |transcript|
        gff_data << transcript_to_gff(transcript)
      end
    end
    puts create_gff_file_from_data(gff_data)
  end

  def transcript_to_gff(transcript)
    data = []
    data << feature_to_gff(transcript)

    phase = 0
    transcript['subfeatures'].each do |subfeature|
      unless BLACKLISTED_TYPES.include? subfeature['type']
        data << feature_to_gff(subfeature, phase, true)
      end

      if subfeature['type'] == 'CDS'
        start = subfeature['start']
        stop = subfeature['end']
        phase = (3 - (((stop + 1) - start - phase) % 3)) % 3
      end
    end

    data
  end

  def feature_to_gff(subfeature, phase = nil, parent = false, gene = false)
    gff_strand = {
      1  => '+',
      -1 => '-',
      nil => '.'
    }

    if gene
      type = 'gene'
    else
      type = subfeature['type'] == 'transcript' ? 'mRNA' : subfeature['type']
      @subfeature_count[type] += 1
    end

    data = []

    data << "#{subfeature['seq_id']}"
    data << 'afra' # source
    data << "#{type}"
    data << "#{subfeature['start']}"
    data << "#{subfeature['end']}"
    data << '.' # score
    data << "#{gff_strand[subfeature['strand']]}"

    # phase
    if type == 'CDS'
      data << "#{phase}"
    else
      data << '.'
    end

    # attributes
    attribute_hash = {
      id: "ID=#{type}#{@subfeature_count[type]};",
      name: "Name=#{subfeature['name']};"
    }
    unless gene
      if parent
        attribute_hash[:parent] = "Parent=mRNA#{@subfeature_count['mRNA']}"
      else
        attribute_hash[:parent] = "Parent=gene#{@subfeature_count['gene']}"
      end
    end

    attribute = attribute_hash.values.join('')
    data << attribute

    data
  end

  def create_gff_file_from_data(gff_data)
    sr_data = []  # sr: sequence-region
    seq_id_index = {}

    # Seperate the transcript data on the basis of their seq_id
    gff_data.each do |transcript_data|
      seq_id = transcript_data[0][0]
      unless seq_id_index.keys.include? seq_id
        seq_id_index[seq_id] = sr_data.length
        sr_data << []
      end

      sr_data[seq_id_index[seq_id]] << transcript_data
    end

    sr_str = []
    sr_data.each_with_index do |file, i|
      sr_str << []
      seq_id = seq_id_index.invert[i]
      start = 1
      stop = RefSeq.where(seq_id: seq_id).first[:length]
      sr_str[i] << "##sequence-region #{seq_id} #{start} #{stop}"

      file.each do |transcript_data|
        sr_str[i] << transcript_data.map {|line| line.join("\t")}.join("\n")
      end

      # REVIEW: this is crazy if the this line is seperated by tabs instead of
      # space then the validator marks it as wrong
      sr_str[i] = sr_str[i].join("\n")
    end

    "##gff-version 3\n" + sr_str.join("\n")
  end
end

# References
# ==========
#
# [1]: http://www.sequenceontology.org/gff3.shtml
# [2]: http://genometools.org/cgi-bin/gff3validator.cgi
