module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    lint: {
      all: [
        'js/*.js',
        'js/createjs/*.js',
        'js/viejs/*.js',
        'js/models/*.js',
        'js/views/*.js',
        'js/routers/*.js'
      ]
    },
    concat: {
      dist: {
        // @todo: do we want to concat VIE and createjs, too?
        src: [
          'js/createjs/*.js',
          'js/viejs/*.js',
          'js/models/*.js',
          'js/views/*.js',
          'js/routers/*.js',
          'js/*.js'
        ],
        // @todo: shouldn't we keep source and build/ more separate?
        dest: 'js/build/edit.js'
      },
      'dist-all': {
        src: [
          'js/lib/*',
          'js/createjs/*.js',
          'js/viejs/*.js',
          'js/models/*.js',
          'js/views/*.js',
          'js/routers/*.js',
          'js/*.js'
        ],
        dest: 'js/build/edit-all.js'
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
      },
      'dist-all':{
        src: ['js/build/edit-all.js'],
        dest: 'js/build/edit-all.min.js'
      },
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
        _: true
      }
    }
  });

  // Load local tasks; we should add local tasks later.
  // grunt.loadTasks("tasks");

  // Set default
  grunt.registerTask('default', 'lint concat min');

};
