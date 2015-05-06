module.exports = function (config) {
  'use strict';
  config.set({
    basePath: './',

    files: [
      {
        pattern: 'dist/peeracle-0.0.1.js',
        included: true
      },
      'dist/peeracle-0.0.1.js',
      'spec/**/*-spec.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['Chrome', 'Firefox'],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-coverage',
      'karma-junit-reporter',
      'karma-verbose-reporter'
    ],

    reporters: ['verbose', 'junit', 'coverage'],

    preprocessors: {
      'dist/peeracle-0.0.1.js': ['coverage']
    },

    coverageReporter: {
      type: 'html',
      dir: 'coverage/browser'
    },

    junitReporter: {
      outputFile: 'reports/unit.xml',
      suite: 'unit'
    },

    singleRun: true
  });
};
