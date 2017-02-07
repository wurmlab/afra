module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
        dist: {
            options: {
                banner: '/*! GeneValidator API <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                preserveComments: false,
                mangle: {
                    sort: true,
                },
                sourceMap: false,
                compress: {
                    sequences: true,
                    dead_code: true,
                    conditionals: true,
                    booleans: true,
                    unused: true,
                    if_return: true,
                    join_vars: true,
                    drop_console: false
                }
            },
            files: {
                'build/genevalidatorappAPI.min.js': ['src/genevalidatorappAPI.js']
            },
        },
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['uglify']);

};
