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

desc 'Migrate database.'
task 'db:migrate', [:version] do |t, args|
  require_relative 'app'
  version = Integer(args[:version]) rescue nil
  App.migrate version: version
end

desc 'Reset database.'
task 'db:reinit'  do
  require_relative 'app'
  migration_first = 3
  migration_last  = App.current_migration
  App.migrate version: migration_first
  App.migrate version: migration_last
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

desc 'Create user.'
task 'user:new' do
  require_relative 'app'
  App.init_config
  App.load_models

  print 'Name: '
  name = STDIN.gets.chomp
  print 'Email: '
  email = STDIN.gets.chomp
  print 'Pasword: '
  password = STDIN.gets.chomp
  User.create(name: name, email: email, password: password)
end

desc 'Create mock users.'
task 'mock:users' do
  require_relative 'app'
  App.init_config
  App.load_models

  User.create(name: 'Mario', email: 'mario@toadstool.com', password: 'mario')
  User.create(name: 'Luigi', email: 'luigi@toadstool.com', password: 'luigi')
  User.create(name: 'Yoshi', email: 'yoshi@toadstool.com', password: 'yoshi')
end

desc 'Test auto-check'
task 'auto-check' do

end

task default: [:install, :'db:migrate', :configure]
