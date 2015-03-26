module.exports = function (grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    banner: '/*\n' +
    ' * Copyright (c) 2015 peeracle contributors\n' +
    ' *\n' +
    ' * Permission is hereby granted, free of charge, to any person obtaining a copy\n' +
    ' * of this software and associated documentation files (the "Software"), to deal\n' +
    ' * in the Software without restriction, including without limitation the rights\n' +
    ' * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n' +
    ' * copies of the Software, and to permit persons to whom the Software is\n' +
    ' * furnished to do so, subject to the following conditions:\n' +
    ' *\n' +
    ' * The above copyright notice and this permission notice shall be included in all\n' +
    ' * copies or substantial portions of the Software.\n' +
    ' *\n' +
    ' * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n' +
    ' * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n' +
    ' * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n' +
    ' * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n' +
    ' * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n' +
    ' * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n' +
    ' * SOFTWARE.\n' +
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
        stripBanners: true
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
        banner: '<%= banner %>\n',
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
