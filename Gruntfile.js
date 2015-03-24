module.exports = function (grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    banner: '/*!\n' +
    ' * peeracle v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
    ' * Copyright 2015\n' +
    ' * Licensed under <%= pkg.license %>\n' +
    ' */\n',

    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>\n' +
        '\'use strict\';\n' +
        'var Peeracle = {};\n' +
        'Peeracle.Checksum = {};\n' +
        'Peeracle.Media = {};\n' +
        'Peeracle.Tracker = {};\n',

        process: function (src, filepath) {
          return src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1')
            .replace(/module.exports = (.*);/g, 'Peeracle.$1 = $1;');
        },
        stripBanners: false
      },
      dist: {
        src: [
          'src/checksum.crc32.js',
          'src/utils.js',
          'src/file.js',
          'src/media.webm.js',
          'src/metadata.js',
          'src/metadata.serializer.js',
          'src/metadata.unserializer.js',
          'src/mediachannel.js',
          'src/signalchannel.js',
          'src/peer.js',
          'src/tracker.client.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    preprocess: {
      inline: {
        src: ['dist/*.js'],
        options: {
          inline: true,
          context: {
            DEBUG: false
          }
        }
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
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-preprocess');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'preprocess', 'karma', 'uglify']);

  // Build only task
  grunt.registerTask('dist', ['concat', 'preprocess', 'uglify']);
};
