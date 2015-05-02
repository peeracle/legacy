/*
 * Copyright (c) 2015 peeracle contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function (global) {
  'use strict';

  var http = require('http');
  var WebSocketServer = require('websocket').server;
  var winston = require('winston');

  var Tracker = {
    Message: require('./tracker.message')
  };

  /**
   * @class
   * @memberof Peeracle.Tracker
   * @constructor
   */
  function Server() {
    this.server_ = null;
    this.ws_ = null;

    winston.loggers.add('Server', {
      console: {
        level: 'info',
        colorize: true,
        label: 'Server'
      }
    });

    this.log_ = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({
          timestamp: function () {
            return Date.now();
          },
          formatter: function (options) {
            return options.timestamp().toLocaleString() + ' [' +
              options.level.toUpperCase() + '] ' +
              (undefined !== options.message ? options.message : '') +
              (options.meta && Object.keys(options.meta).length ?
              '\n\t' + JSON.stringify(options.meta) : '');
          }
        }),
        new (winston.transports.DailyRotateFile)({
          filename: 'tracker',
          datePattern: '.yyyy-MM-dd'
        })
      ]
    });
  }

  Server.prototype.listen = function (host, port) {
    this.server_ = http.createServer(function (request, response) {
      response.writeHead(404);
      response.end();
    }).listen(port, host, function () {
      this.log_.log('info', 'Listening on ' + host + ':' + parseInt(port));
    }.bind(this));

    this.ws_ = new WebSocketServer({
      httpServer: this.server_,
      autoAcceptConnections: false
    });

    this.ws_.on('request', function (request) {
      // TODO: detect origin
      var sock;
      try {
        sock = request.accept('prcl-0.0.1', request.origin);
      } catch (e) {
        return;
      }

      this.log_.log('info', 'new user connected from ' + sock.remoteAddress);
      sock.on('message', function (message) {
        if (message.type !== 'binary') {
          return;
        }

        var msg = new Tracker.Message(new Uint8Array(message.binaryData));
        this.log_.log('info', 'Got new message', msg);
      }.bind(this));

      sock.on('close', function (reasonCode, description) {
        this.log_.log('info', 'closed', {reasonCode: reasonCode, description: description});
      }.bind(this));
    }.bind(this));
  };

  global.Server = Server;
})(Peeracle.Tracker || this.Tracker);
