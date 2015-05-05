module.exports = function (config) {
  'use strict';
  config.set({
    basePath: './',

    files: [
      {
        pattern: 'dist/peeracle-0.0.1.js',
        included: true
      },
      'spec/**/*-spec.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['Chrome', 'Firefox'],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-junit-reporter',
      'karma-verbose-reporter'
    ],

    reporters: ['verbose', 'junit'],

    junitReporter: {
      outputFile: 'unit.xml',
      suite: 'unit'
    },

    singleRun: true
  });
};
