# Import annotations into the system.
class Importer

  def initialize(annotations_file)
    @annotations_file = annotations_file
  end

  attr_reader :annotations_file

  def format_for_visualization
    puts   "Converting GFF to JBrowse ..."
    system "bin/gff2jbrowse.pl -o data/jbrowse '#{annotations_file}'"
    puts   "Generateing index ..."
    system "bin/generate-names.pl -o data/jbrowse"
  end

  def register_for_curation
    puts "Registering features ..."
    Dir[File.join('data', 'jbrowse', 'tracks', 'maker', '*')].each do |dir|
      next if dir =~ /^\.+/
      names = File.readlines File.join(dir, 'names.txt')
      names.each do |name|
        name = eval name.chomp

        PredictedFeature.create({
          name:  name[-4],
          ref:   name[-3],
          start: name[-2],
          end:   name[-1]
        })
      end
    end
  end

  def create_curation_tasks
    puts "Creating tasks ..."

    # Feature loci on all refs, sorted and grouped by ref.
    # [{ref: ..., id: [], start: [], end: []}, ...]
    loci_all_ref = App.db.select(
      Sequel.function(:array_agg, :id).as(:feature_ids),
      Sequel.function(:array_agg, :start).as(:feature_start_coordinates),
      Sequel.function(:array_agg, :end).as(:feature_end_coordinates),
      :ref).group(:ref).from(Feature.select(:id, :ref, :start, :end).order(Sequel.asc(:start)))

    loci_all_ref.each do |loci_this_ref|
      # Ref being processed.
      ref = loci_this_ref[:ref]

      # Group overlapping loci together.
      #
      # About overlapping genes: http://www.biomedcentral.com/1471-2164/9/169.
      groups = [] # [{start: , end: , feature_ids: []}, ...]
      loci_this_ref[:feature_ids].each_with_index do |feature_id, i|
        start = loci_this_ref[:feature_start_coordinates][i]
        _end = loci_this_ref[:feature_end_coordinates][i]

        if not groups.empty? and start < groups.last[:end] # overlap
          groups.last[:feature_ids] << feature_id
          groups.last[:end] = [groups.last[:end], _end].max
        else
          groups << {ref: ref, start: start, end: _end, feature_ids: [feature_id]}
        end
      end

      # Create tasks.
      groups.each do |group|
        feature_ids = group.delete :feature_ids
        t = CurationTask.create group
        feature_ids.each do |feature_id|
          t.add_feature feature_id
        end
        t.difficuluty = feature_ids.length
        t.save
      end
    end
  end

  def run
    format_for_visualization
    register_for_curation
    create_curation_tasks
  end
end
