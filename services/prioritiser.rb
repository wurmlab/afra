class Prioritiser

  # Expects YAML file.
  def initialize(names_file)
    @names = YAML.load_file names_file
  end

  attr_reader :names

  # Features corresponding to given names.
  def features
    @features ||= names.map{|n| Feature.first(name: n)}
  end

  # Tasks corresponding to given features.
  def tasks
    @tasks ||= features.map{|f| Task.where(start: f.start).first}.compact
  end

  def prioritise(value = 20)
    tasks.each do |task|
      task.priority = value
      task.save
    end
  end
end
