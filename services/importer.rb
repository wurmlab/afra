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

    # Select feature id, start and end coordinates grouped by ref.
    features =
      Feature.order(Sequel.asc(:start)).
      select(Sequel.function(:array_agg, :id).as(:id),
             Sequel.function(:array_agg, :start).as(:start),
             Sequel.function(:array_agg, :end).as(:end),
             :ref).
             group(:ref)

    features.each do |f|
      ref = f.ref
      f.id.zip(f.start, f.end).each_cons(2) do |f1, f2|
        if f2[1] <= f1[2] # features overlap
          start = f1[1]
          stop  = [f1[2], f2[2]].max # in case f2 is contained in f1
          t = CurationTask.create(ref: ref, start: start, end: stop)
          t.add_feature Feature.with_pk(f1[0])
          t.add_feature Feature.with_pk(f2[0])
          t.save
          puts "#{t.id} #{f.ref}:#{start}..#{stop}"
        else
          start = f1[1]
          stop  = f1[2]
          t = CurationTask.create(ref: ref, start: start, end: stop)
          t.add_feature Feature.with_pk(f1[0])
          t.save
        end
        # FIXME: last feature of each ref seq gets ignored.
        # FIXME: this approach assumes only two genes will overlap, however,
        # that need not be the case.
      end
    end
  end

  def run
    format_for_visualization
    register_for_curation
    create_curation_tasks
  end
end
