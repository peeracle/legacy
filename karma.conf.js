module.exports = function (config) {
  'use strict';

  config.set({
    basePath: './',

    files: [
      {
        pattern: 'dist/peeracle-0.0.1.js',
        included: true
      },
      'test/**/*-spec.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['Chrome', 'Firefox'],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-junit-reporter'
    ],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }
  });
};
