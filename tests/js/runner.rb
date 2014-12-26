require 'sinatra'
require 'capybara-webkit'

# Run Jasmine specs headless using Capybara.
class CapybaraJasmine

  include Capybara::DSL

  def initialize
    Capybara.current_driver = :webkit
    Capybara.app = app
  end

  def run
    visit '/tests/js/index.html'
    sleep 0.05 until evaluate_script("window.jsApiReporter &&
                                   window.jsApiReporter.finished")
    puts evaluate_script "window.jsApiReporter.consoleOutput()"
    exit evaluate_script "window.jsApiReporter.passed"
  end

  def app
    static = Class.new(Sinatra::Base)
    static.public_dir = Dir.pwd
    static
  end
end
