require 'logger'
require 'sequel'
require 'sinatra/base'
require 'puma/server'

module App

  class Routes < Sinatra::Base
    class << self
      ## OVERRIDE
      def middleware
        @middleware
      end

      def inherited(klass)
        super
        use klass
      end
      ## /OVERRIDE
    end

    enable  :logging

    disable :show_exceptions
  end

  class Server < Puma::Server

    attr_reader :binds, :daemonize

    def initialize(binds, daemonize: false)
      @binds = binds
      @daemonize = daemonize
      super nil
    end

    def serve(app)
      self.app = app
      binder.parse binds, events
      if daemonize
        events.log "* Daemonizing ..."
        Process.daemon(true)
      end
      run.join
    rescue Interrupt
      # swallow it
    end
  end

  extend self

  def init_config(**config)
    defaults = {
      db_uri: 'postgres://localhost',
      binds:  ['tcp://localhost:9292']
    }
    @config = defaults.update config
  rescue Errno::ENOENT
    puts "Couldn't find file: #{config}."
  end

  def init_db
    @db = Sequel.connect config[:db_uri], loggers: Logger.new($stderr)
    @db.extension :pg_json
    @db.extension :pg_array
    Sequel.extension :pg_json_ops
  end

  def init_server
    @server = Server.new(config[:binds], daemonize: config[:daemonize])
  end

  attr_reader :config, :db, :server

  def load_models
    init_db
    Sequel::Model.db = db
    Sequel::Model.plugin :json_serializer
    Dir['models/*.rb'].each do |model|
      require_relative model
    end
  rescue Sequel::DatabaseConnectionError
    puts "Couldn't connect to database."
    exit
  end

  def load_routes
    Dir['routes/*.rb'].each do |route|
      require_relative route
    end
  end

  def migrate(version: nil, **options)
    init_config **options
    init_db
    Sequel.extension :migration
    db.extension :constraint_validations
    Sequel::Migrator.apply(db, File.expand_path('migrations'), version)
  rescue Sequel::DatabaseConnectionError
    puts "Couldn't connect to database."
    exit
  end

  def current_migration(**options)
    init_config **options
    init_db
    Sequel.extension :migration
    Sequel::IntegerMigrator.new(db, File.expand_path('migrations')).current
  end

  def gff2jbrowse(**options)
    init_config **options
    puts   "Converting GFF to JBrowse ..."
    system "bin/gff2jbrowse.pl -o data/jbrowse 'data/gene/Solenopsis invicta/Si_gnF.gff'"
    puts   "Generateing index ..."
    system "bin/generate-names.pl -o data/jbrowse"
  end

  def register_features(**options)
    puts "Registering features ..."
    init_config **options
    init_db
    load_models
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

  def create_tasks(**options)
    puts "Creating tasks ..."
    init_config **options
    init_db
    load_models

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

  def auto_check_tasks(**options)
    puts "Auto check ..."
    init_config **options
    load_models
    Task.all.select do |t|
      next unless t.submissions.count >= 3 # TODO: I think it should be == 3

      if t.submissions.uniq.length == 1
        t.contributions.each do |contribution|
          contribution.status = 'accepted'
          contribution.save
        end
      else
        t.contributions.each do |contribution|
          contribution.status = 'accepted'
          contribution.save
        end
      end
    end
  end

  def irb(**options)
    init_config **options
    load_models
    require 'irb'
    IRB.start
  end

  def serve(**options)
    init_config **options
    load_models
    load_routes
    init_server
    server.serve(Routes)
  end
end
