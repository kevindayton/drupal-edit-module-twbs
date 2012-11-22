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
    },
    csslint: {
      all: {
        src: 'css/edit.css',
        rules: {
          'adjoining-classes': false,
          'ids': false,
          'outline-none': false,
          'box-model': false,
          'overqualified-elements': false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-css');
  grunt.registerTask('default', 'lint concat min csslint');
};
