class Feature < Sequel::Model

  many_to_one   :ref_seq

  def ==(other)
    v1 = self.values
    v2 = other.values
    [v1, v2].each{|v| v.delete :id}
    v1 == v2
  end
end
