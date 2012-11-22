module.exports = function(grunt) {
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
        src: [
          'js/createjs/*.js',
          'js/viejs/*.js',
          'js/models/*.js',
          'js/views/*.js',
          'js/routers/*.js',
          'js/*.js'
        ],
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
        _: true
      }
    }
  });

  grunt.registerTask('default', 'lint concat min');
};
