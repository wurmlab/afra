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
      db_uri: 'postgres://localhost/afra',
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
    Sequel.datetime_class = DateTime
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
    Dir['routes/*.rb'].sort.each do |route|
      require_relative route
    end
  end

  def load_services
    load_models
    Dir['services/*.rb'].each do |service|
      require_relative service
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
    load_services
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
