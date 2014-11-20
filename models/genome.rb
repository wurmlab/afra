class Genome < Sequel::Model
  one_to_many :ref_seqs

  # Returns Sequel::Dataset of all mRNAs in this genome.
  #
  # Must call `all` on the return value to get an Array.
  def mRNAs
    Feature.
      where(type: 'mRNA').
      where(ref_seq_id: ref_seqs.map(&:seq_id))
  end
end
