class Feature < Sequel::Model

  one_to_many :tasks

  plugin        :class_table_inheritance,
    key:         :type

  def ==(other)
    v1 = self.values
    v2 = other.values
    [v1, v2].each{|v| v.delete :id}
    v1 == v2
  end
end

class PredictedFeature < Feature; end

class UserCreatedFeature < Feature

  one_to_one :curation
end
