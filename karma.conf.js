module.exports = function (config) {
  'use strict';

  var customLaunchers = {
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 7',
      version: '40'
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '37'
    }
  };

  config.set({
    basePath: './',

    files: [
      {
        pattern: 'dist/peeracle-0.0.1.min.js',
        included: true
      },
      'spec/**/*-spec.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    sauceLabs: {
      testName: 'Peeracle Web Unit Tests'
    },
    customLaunchers: customLaunchers,
    browsers: Object.keys(customLaunchers),
    reporters: ['dots', 'saucelabs'],
    singleRun: true,

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-sauce-launcher',
      'karma-jasmine',
      'karma-junit-reporter'
    ],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }
  });
};
