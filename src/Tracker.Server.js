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

'use strict';

var http = require('http');
var WebSocketServer = require('websocket').server;
var Tracker = require('./Tracker');

/**
 * @class
 * @memberof Peeracle.Tracker
 * @constructor
 */
function Server() {
  this.server_ = null;
  this.ws_ = null;
}

Server.prototype.listen = function listen(host, port) {
  this.server_ = http.createServer(function createServer(request, response) {
    response.writeHead(404);
    response.end();
  }).listen(port, host, function httpListen() {
  }.bind(this));

  this.ws_ = new WebSocketServer({
    httpServer: this.server_,
    autoAcceptConnections: false
  });

  this.ws_.on('request', function onRequest(request) {
    // TODO: detect origin
    var sock;
    try {
      sock = request.accept('prcl-0.0.1', request.origin);
    } catch (e) {
      return;
    }

    sock.on('message', function onMessage(message) {
      var msg;
      if (message.type !== 'binary') {
        return;
      }

      msg = new Tracker.Message(new Uint8Array(message.binaryData));
    }.bind(this));

    sock.on('close', function onClose(reasonCode, description) {
    }.bind(this));
  }.bind(this));
};

module.exports = Server;
