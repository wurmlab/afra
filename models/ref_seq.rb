require 'zlib'

class RefSeq < Sequel::Model

  # Nucleotides are stored here. Only some metadata about the sequence goes
  # into the database.
  SEQ_STORE  = File.expand_path 'data/jbrowse/seq'

  # Value derived from JBrowse. If we change chunk size in JBrowse scripts,
  # this value will need to be updated accordingly.
  CHUNK_SIZE = 20000

  unrestrict_primary_key

  many_to_one :genome

  one_to_many :features

  def species
    genome.species
  end

  def asm_id
    genome.asm_id
  end

  def value
    (0..nchunks).map do |i|
      File.read File.join(store, "#{seq_id}-#{i}.txt")
    end.join
  end

  private

  def store
    @store ||= File.join(SEQ_STORE, *hash)
  end

  def hash
    # 8 byte CRC checksum of seq_id in lowercase hexadecimal, padded with
    # leading zero if need be, and minus sign replaced with 'n'.
    Zlib.crc32(seq_id).to_s(16).downcase.sub('-', 'n').rjust(8).scan(/...?/)
  end

  def nchunks
    length  / CHUNK_SIZE
  end
end
