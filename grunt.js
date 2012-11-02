module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    lint: {
      all: ['js/*.js']
    },
    concat: {
      dist: {
        // @todo: do we want to concat VIE and createjs, too?
        src: ['js/*.js'],
        // @todo: shouldn't we keep source and build/ more separate?
        dest: 'js/build/edit.js'
      }
    },
    watch: {
      files: '<config:lint.all>',
      tasks: 'default'
    },
    min: {
      dist: {
        src: ['js/build/edit.js'],
        dest: 'js/build/edit.min.js'
      }
    },
    jshint: {
      options: {
        curly: true,
        immed: false,
        undef: true,
        browser: true,
        laxbreak: true
      },
      globals: {
        jQuery: true,
        Backbone: true,
        Drupal: true,
        VIE: true,
        _: true,
        // we should remove this later on.
        console: true
      }
    }
  });

  // Load local tasks; we should add local tasks later.
  // grunt.loadTasks("tasks");

  // Set default
  grunt.registerTask('default', 'lint concat min');

};
