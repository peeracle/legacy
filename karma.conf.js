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

    frameworks: ['jasmine', 'express-http-server'],

    browsers: ['Chrome', 'Firefox'],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-coverage',
      'karma-junit-reporter',
      'karma-verbose-reporter',
      'karma-express-http-server'
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

    expressHttpServer: {
      port: 3000,
      // this function takes express app object and allows you to modify it
      // to your liking. For more see http://expressjs.com/4x/api.html
      appVisitor: function appVisitor(app, log) {
        var bytes = new Uint8Array([26, 69, 223, 163, 159, 66, 134, 129, 1,
          66, 247, 129, 1, 66, 242, 129, 4, 66, 243, 129,
          8, 66, 130, 132, 119, 101, 98, 109, 66, 135, 129,
          2, 66]);
        var length = bytes.length;

        app.use(function appUse(req, res, next) {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Content-Type');
          res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
          next();
        });

        app.head('/', function appHead(req, res) {
          res.header('Content-Length', length);

          res.status(200).end();
        });

        app.get('/', function appGet(req, res) {
          var rangeStr = req.get('Range');
          if (!rangeStr) {
            res.header('Content-Type', 'application/octet-stream');
            res.header('Content-Length', length);
            res.status(200).send(new Buffer(bytes));
            return;
          }

          var range = rangeStr.substr(6, rangeStr.length - 6);
          var min = parseInt(range.split('-')[0], 10);
          var max = parseInt(range.split('-')[1], 10) + 1;
          var result = bytes.subarray(min, max);

          res.header('Content-Type', 'application/octet-stream');
          res.header('Content-Length', max - min);
          res.header('Content-Range', 'bytes ' + range + '/' + length);

          res.status(206).send(new Buffer(result));
        });

        app.options('/', function appOptions(req, res) {
          res.header('Content-Length', length);

          res.status(200).send(null);
        });

        app.use(function notFound(req, res) {
          res.status(404).end();
        });
      }
    },

    singleRun: true
  });
};
