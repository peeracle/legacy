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
    ' * The above copyright notice and this permission notice shall be included in\n' +
    ' * all copies or substantial portions of the Software.\n' +
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
        '\'use strict\';\n\n' +
        '(function(){\n' +
        '\n' +
        'var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || \
        window.webkitRTCPeerConnection || window.msRTCPeerConnection;\n' +
        'var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || \
        window.webkitRTCSessionDescription || window.msRTCSessionDescription;\n' +
        'var RTCIceCandidate = window.mozRTCIceCandidate || window.webkitRTCIceCandidate || \
        window.RTCIceCandidate;\n',

        footer: '\nwindow[\'Peeracle\'] = Peeracle;\n})();\n',

        process: function (src, filepath) {
          var moduleName = filepath.slice(4, filepath.length - 3);
          var modules = moduleName.split('/');
          console.log(modules);
          var moduleStr = 'Peeracle';
          for (var i = 0; i < modules.length; ++i) {
            if (modules[i] === 'index') {
              continue;
            }
            moduleStr += '.' + modules[i];
          }

          return src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\n/g, '$1')
            .replace(/module.exports = /g, moduleStr + ' = ')
            .replace(/var (.*) = require\('.\/(.*)'\);/g, 'var $1 = Peeracle.$2;');
        },
        stripBanners: true
      },
      dist: {
        src: [
          'third_party/murmurHash3.js/murmurHash3.js',

          'src/Listenable.js',
          'src/Peeracle.js',
          'src/BinaryStream.js',

          'src/Hash/index.js',
          'src/Hash/Crc32.js',
          'src/Hash/Murmur3.js',

          'src/DataSource/index.js',
          'src/DataSource/File.js',
          'src/DataSource/Http.js',

          'src/Downloader/index.js',
          'src/Downloader/Http.js',
          'src/Downloader/P2P.js',

          'src/Manager.js',

          'src/Media/index.js',
          'src/Media/MP4.js',
          'src/Media/WebM.js',

          'src/Metadata.js',
          'src/MetadataSerializer.js',
          'src/MetadataUnserializer.js',

          'src/Player/index.js',
          'src/Player/Buffer.js',
          'src/Player/Controller.js',

          'src/Peer/index.js',
          'src/Peer/Connection.js',
          'src/Peer/Message.js',

          'src/Session.js',
          'src/Storage/index.js',
          'src/Storage/Memory.js',

          'src/Stream.js',

          'src/Tracker/index.js',
          'src/Tracker/Client.js',
          'src/Tracker/Message.js',

          'src/Utils.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    preprocess: {
      inline: {
        src: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        options: {
          inline: true,
          context: {
            DEBUG: false
          }
        }
      }
    },

    jsbeautifier: {
      files: ['dist/<%= pkg.name %>-<%= pkg.version %>.js'],
      options: {
        js: {
          braceStyle: "collapse",
          breakChainedMethods: false,
          e4x: false,
          evalCode: false,
          indentChar: " ",
          indentLevel: 0,
          indentSize: 2,
          indentWithTabs: false,
          jslintHappy: false,
          keepArrayIndentation: false,
          keepFunctionIndentation: false,
          maxPreserveNewlines: 10,
          preserveNewlines: true,
          spaceBeforeConditional: true,
          spaceInParen: false,
          unescapeStrings: false,
          wrapLineLength: 80,
          endWithNewline: true
        }
      }
    },

    eslint: {
      target: ['src/*.js']
    },

    'closure-compiler': {
      frontend: {
        closurePath: '.',
        js: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.js',
          'exports.js'
        ],
        jsOutputFile: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js',
        maxBuffer: 500,
        options: {
          compilation_level: 'ADVANCED_OPTIMIZATIONS',
          language_in: 'ECMASCRIPT5_STRICT'
        }
      },
      frontend_debug: {
        closurePath: '.',
        js: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        jsOutputFile: 'dist/<%= pkg.name %>-<%= pkg.version %>.debug.js',
        options: {
          debug: true,
          formatting: 'PRETTY_PRINT'
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-preprocess');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-closure-compiler');
  grunt.loadNpmTasks('grunt-contrib-jasmine');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'preprocess', 'eslint', 'jsbeautifier'/*, 'closure-compiler'*/, 'karma']);

  // Build only task
  grunt.registerTask('build', ['concat', 'preprocess'/*, 'eslint'*/, 'jsbeautifier'/*, 'closure-compiler'*/]);
  grunt.registerTask('test', ['karma']);
};
