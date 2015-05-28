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
  this.id_ = 1;
}

Server.prototype.incomingRequest_ = function incomingRequest_(request) {
  var sock;

  var onMessage_ = function onMessage_(message) {
    var msg;
    if (message.type !== 'binary') {
      return;
    }

    msg = new Tracker.Message(new Uint8Array(message.binaryData));
    console.log(msg);

    if (msg.props.type === Tracker.Message.Type.Hello) {
      console.log('hello message received');
      sock.id = this.id_++;
      msg = new Tracker.Message({
        type: Tracker.Message.Type.Welcome,
        id: sock.id
      });
      sock.send(new Buffer(msg.serialize()));
    }
  };

  var onClose_ = function onClose_(reasonCode, description) {
    console.log('info', 'closed', {reasonCode: reasonCode, description: description});
  };

  try {
    sock = request.accept('prcl-0.0.1', request.origin);
    sock.id = null;
    sock.on('message', onMessage_.bind(this));
    sock.on('close', onClose_.bind(this));
    console.log('info', 'user origin ' + request.origin);
  } catch (e) {
    console.log(e);
  }
};

Server.prototype.listen = function listen(host, port) {
  this.server_ = http.createServer(function createServer(request, response) {
    response.writeHead(404);
    response.end();
  }).listen(port, host, function httpListen() {
    console.log('info', 'Listening on ' + host + ':' + parseInt(port, 10));
  }.bind(this));

  this.ws_ = new WebSocketServer({
    httpServer: this.server_,
    autoAcceptConnections: false
  });

  this.ws_.on('request', this.incomingRequest_.bind(this));
};

module.exports = Server;
