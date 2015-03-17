module.exports = function (grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    banner: '/*!\n' +
    ' * peeracle v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
    ' * Copyright 2015 <%= pkg.author %>\n' +
    ' * Licensed under <%= pkg.license %>\n' +
    ' */\n',

    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>\n',
        stripBanners: false
      },
      dist: {
        src: [
          'src/mediachannel.js',
          'src/signalchannel.js',
          'src/peer.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    uglify: {
      options: {
        preserveComments: 'some'
      },
      build: {
        src: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Default task(s).
  grunt.registerTask('default', ['karma', 'concat', 'uglify']);
};
