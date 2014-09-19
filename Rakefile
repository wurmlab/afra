desc 'Install dependencies.'
task 'install' do
  puts 'installing gems ...'
  system("gem install --file Gemfile")

  puts
  puts 'installing perl modules ...'
  %x{
done_message () {
    if [ $? == 0 ]; then
        echo " done."
        if [ "x$1" != "x" ]; then
            echo $1;
        fi
    else
        echo " failed." $2
    fi
}

# log information about this system
(
    echo '============== System information ====';
    set -x;
    lsb_release -a;
    uname -a;
    sw_vers;
    system_profiler;
    grep MemTotal /proc/meminfo;
    echo; echo;
);

echo -n "Installing Perl prerequisites ..."
if ! ( perl -MExtUtils::MakeMaker -e 1 >/dev/null 2>&1); then
    echo;
    echo "WARNING: Your Perl installation does not seem to include a complete set of core modules.  Attempting to cope with this, but if installation fails please make sure that at least ExtUtils::MakeMaker is installed.  For most users, the best way to do this is to use your system's package manager: apt, yum, fink, homebrew, or similar.";
fi;
( set -x;
  bin/cpanm -v --notest -l $PWD/.extlib/ --installdeps . < /dev/null;
  bin/cpanm -v --notest -l $PWD/.extlib/ --installdeps . < /dev/null;
  set -e;
  bin/cpanm -v --notest -l $PWD/.extlib/ --installdeps . < /dev/null;
);
done_message "" "As a first troubleshooting step, make sure development libraries and header files for Zlib are installed and try again.";
  }

  puts
  puts 'installing npm packages ...'
  system('npm install')

  puts 'installing bower packages ...'
  system("npm run-script bower")

  puts
  puts 'AMDfying jquery.ui ...'
  system("npm run-script amdify-jquery")
end

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

  unless Setting['session_secret']
    begin
      require 'securerandom'
      Setting.create(key: 'session_secret', value: SecureRandom.hex(64))
    rescue LoadError, NotImplementedError
      # SecureRandom raises a NotImplementedError if no random device is available
      set :session_secret, "%064x" % Kernel.rand(2**256-1)
      Setting.create(key: 'session_secret', value: "%064x" % Kernel.rand(2**256-1))
    end
  end

  print 'Facebook App ID: '
  fb_app_id = STDIN.gets.chomp
  Setting.create(key: 'facebook_app_id', value: fb_app_id)

  print 'Facebook App secret: '
  fb_app_secret = STDIN.gets.chomp
  Setting.create(key: 'facebook_app_secret', value: fb_app_secret)
end

desc 'Import'
task 'import', [:annotations_file] do |t, args|
  require_relative 'app'
  App.init_config
  App.load_services
  annotations_file = args[:annotations_file]
  puts
  puts
  puts "Importing #{annotations_file}"
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

desc 'Run unit tests for JS code.'
task 'test:js' do
  require_relative 'app'
  static = Class.new(Sinatra::Base)
  static.public_dir = Dir.pwd
  App.init_config(binds: ['tcp://localhost:9293'])
  puts "* Starting jasmine test server ...."
  App.init_server.serve(static)
end

task default: [:install, :'db:init', :'db:migrate', :configure]
