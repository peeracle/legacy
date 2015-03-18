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
        banner: '<%= banner %>\n\'use strict\';\nvar Peeracle = Peeracle || {};\n',
        process: function(src, filepath) {
          var nostrict = src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
          var nopeeracle = nostrict.replace(/(^|\n)[ \t]*(var Peeracle = Peeracle \|\| {});?\s*/g, '$1');
          var nocheck = nopeeracle.replace(/\s*if \(typeof module === 'undefined'\) {\s*(Peeracle..* = .*;)\s*} else {\s*module.exports = .*;\s*}\s*/g, '\n\n  $1\n');
          return '// Source: ' + filepath + '\n' +
            nocheck;
        },
        stripBanners: false
      },
      dist: {
        src: [
          'src/mediachannel.js',
          'src/signalchannel.js',
          'src/peer.js',
          'src/tracker.js'
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
  grunt.registerTask('default', ['concat', 'karma', 'uglify']);

  grunt.registerTask('build', ['concat', 'uglify']);
};
