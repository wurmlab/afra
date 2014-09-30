class Genome < Sequel::Model
  one_to_many :ref_seqs
end
