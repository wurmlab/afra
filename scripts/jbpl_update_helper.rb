#!/usr/bin/env ruby

jb_src   = File.expand_path '~/jbrowse'
jbpl_src = File.join(jb_src, 'src', 'perl5')
afra_src = File.expand_path '~/afra'

# We don't care to borrow the following Perl modules from JB.
#
# The modules below concern legacy image tracks and tracks.conf parser.
ignore = %w[
  ImageTrack.pm
  ImageTrackRenderer.pm
  TiledImage/DBPrimStorage.pm
  TiledImage/MemoryPrimStorage.pm
  TiledImage.pm
  TrackImage.pm

  Bio/JBrowse/ConfigurationFile.pm
]

# We modified the following Perl modules to suit our needs better. Keep our
# changes in mind when updating them.
modified = %w[
  JBlibs.pm
  Bio/JBrowse/FeatureStream/GFF3_LowLevel.pm
]

new_files        = []
old_files        = []
update_candidate = []
Dir[File.join(jbpl_src, '**', '*.pm')].each do |jb_file|
  afra_file = jb_file.sub jbpl_src, afra_src

  unless File.exist? afra_file
    unless ignore.include? afra_file.sub("#{afra_src}/", '')
      new_files << jb_file
    end
    next
  end

  changes = `diff #{afra_file} #{jb_file}`
  changes.strip!
  unless changes.empty?
    update_candidate << jb_file
  end
end

# Glob pattern '<afra_src>/**/*.pm' takes time. Too many dirs and sub-dirs. So
# we optimize a bit.
afra_pms = Dir[File.join(afra_src, '*.pm')] +
  Dir[File.join(afra_src, 'Bio', '**', '*.pm')]
afra_pms.each do |afra_file|
  jb_file = afra_file.sub afra_src, jbpl_src
  unless File.exist? jb_file
    old_files << jb_file
  end
end

unless old_files.empty?
  puts "** In Afra, but not in JB:"
  puts old_files
end

unless new_files.empty?
  puts "** In JB, but not in Afra:"
  puts new_files
end

unless update_candidate.empty?
  puts "** Updated files in JB:"
  update_candidate.each do |u|
    if modified.include? u.sub("#{jbpl_src}/", '')
      u = u + " (*)"
    end
    puts u
  end
end
