## install dependencies
directory '.rake'

file '.rake/rb' => ['.rake', 'Gemfile'] do
  if system 'gem install --file Gemfile'
    touch '.rake/rb'
    Gem.refresh
  end
end

file '.rake/pl' => ['.rake', 'Makefile.PL'] do
  system <<SH
if !(perl -MExtUtils::MakeMaker -e 1 >/dev/null 2>&1); then
    echo;
    echo "WARNING: Your Perl installation does not seem to include a complete
set of core modules.  Attempting to cope with this, but if installation fails
please make sure that at least ExtUtils::MakeMaker is installed.  For most
users, the best way to do this is to use your system's package manager: apt,
yum, fink, homebrew, or similar.";
fi;

(
  set -x;
  bin/cpanm -v --notest -l $PWD/.extlib/ --installdeps . < /dev/null;
  bin/cpanm -v --notest -l $PWD/.extlib/ --installdeps . < /dev/null;
  set -e;
  bin/cpanm -v --notest -l $PWD/.extlib/ --installdeps . < /dev/null;
);
SH
end

file '.rake/js-npm' => ['.rake', 'package.json'] do
  if system 'npm install'
    touch '.rake/js-npm'
  end
end

file '.rake/js-bower' => ['.rake/js-npm', 'bower.json'] do
  if system 'npm run-script bower'
    touch '.rake/js-bower'
  end
end

file 'www/lib/bionode/amd/bionode.js' => ['.rake/js-bower'] do
  system 'npm run-script amdfy-bionode'
end

desc 'Install Ruby dependencies.'
task 'deps:rb' => '.rake/rb'

desc 'Install Perl dependencies.'
task 'deps:pl' => '.rake/pl'

desc 'Install JavaScript dependencies.'
task 'deps:js' => ['.rake/js-npm', '.rake/js-bower',
                   'www/lib/bionode/amd/bionode.js']

desc 'Install all dependencies.'
task 'deps' => ['deps:rb', 'deps:pl', 'deps:js']

desc 'Clean intermediate files generated while installing dependencies.'
task 'clean' do
  rm_r '.rake'
end
## /dependencies

desc 'Create database.'
task 'db:init', [:name] do |t, args|
  system "createdb -e #{args[:name] || 'afra'}"
end

desc 'Migrate database.'
task 'db:migrate', [:version] do |t, args|
  require_relative 'app'
  version = Integer(args[:version]) rescue nil
  App.migrate version: version
end

desc 'Delete database.'
task 'db:drop', [:name] do |t, args|
  system "dropdb -e #{args[:name] || 'afra'}"
end

desc 'Configure.'
task 'configure' do
  require_relative 'app'
  App.init_config
  App.load_models

  if File.exist? 'env.yml'
    ENV.update YAML.load_file 'env.yml'
  end

  unless Setting['session_secret']
    begin
      require 'securerandom'
      Setting.create(key: 'session_secret', value: SecureRandom.hex(64))
    rescue LoadError, NotImplementedError
      # SecureRandom raises a NotImplementedError if no random device is available
      Setting.create(key: 'session_secret', value: "%064x" % Kernel.rand(2**256-1))
    end
  end

  unless Setting['facebook_app_id']
    fb_app_id = ENV['facebook_app_id']
    unless fb_app_id
      print 'Facebook App ID: '
      fb_app_id = STDIN.gets.chomp
    end
    Setting.create(key: 'facebook_app_id', value: fb_app_id)
  end

  unless Setting['facebook_app_secret']
    fb_app_secret = ENV['facebook_app_secret']
    unless fb_app_secret
      print 'Facebook App secret: '
      fb_app_secret = STDIN.gets.chomp
    end
    Setting.create(key: 'facebook_app_secret', value: fb_app_secret)
  end
end

desc 'Import'
task 'import', [:annotations_file] do |t, args|
  require_relative 'app'
  App.init_config
  App.load_services
  annotations_file = args[:annotations_file]
  Importer.new(annotations_file).run
end

desc 'IRb.'
task 'irb' do
  require_relative 'app'
  ARGV.clear
  App.irb
end

desc 'Serve.'
task 'serve', [:uri] do |t, args|
  require_relative 'app'
  App.serve
end

desc 'Run unit tests for Ruby code.'
task 'test:rb' do
  require 'minitest/autorun'
  Dir.glob('tests/rb/test_*.rb').each { |file| require_relative file}
end

desc 'Run unit tests for Perl code.'
task 'test:pl' do
  system 'prove -I tests/pl/lib -I . -lr tests'
end

desc 'Run unit tests for JS code in browser.'
task 'test:js_in_browser' do
  require_relative 'app'
  static = Class.new(Sinatra::Base)
  static.public_dir = Dir.pwd
  App.init_config(binds: ['tcp://localhost:9293'])
  puts "* Starting jasmine test server ...."
  App.init_server.serve(static)
end

desc 'Run unit tests for JS code headless, using Capybara.'
task "test:js" do |t|
  require_relative 'tests/js/runner'
  CapybaraJasmine.new.run
end

task default: [:deps, :'db:init', :'db:migrate', :configure]
