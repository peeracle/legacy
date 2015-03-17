module.exports = function (config) {
  'use strict';

  config.set({
    basePath: './',

    files: [
      {
        pattern: 'src/mediachannel.js',
        included: true
      },
      {
        pattern: 'src/signalchannel.js',
        included: true
      },
      {
        pattern: 'src/peer.js',
        included: true
      },
      'spec/**/*-spec.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['Chrome', 'Firefox', 'Opera'],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-opera-launcher',
      'karma-jasmine',
      'karma-junit-reporter'
    ],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }
  });
};
