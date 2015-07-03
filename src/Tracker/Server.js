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

var geoip = require('geoip-lite');
var uuid = require('node-uuid');
var http = require('http');
var WebSocketServer = require('websocket').server;
var Tracker = require('./');

/**
 * @class
 * @memberof Peeracle.Tracker
 * @constructor
 */
Tracker.Server = function Server() {
  this.server_ = null;
  this.ws_ = null;
  this.id_ = 1;
  this.hashes_ = {};
};

Tracker.Server.prototype.log_ = function log_(sock, msg) {
  var id = sock.id ? sock.id.substr(0, 7) : 'unknown';
  console.log(id + ': ' + msg);
};

Tracker.Server.prototype.incomingRequest_ = function incomingRequest_(request) {
  var sock;

  var handleHelloMessage = function handleHelloMessage(message) {
    sock.id = uuid.v4();
    sock.address = request.remoteAddress;
    sock.geo = geoip.lookup(request.remoteAddress);

    this.log_(sock, 'connected');

    message = new Tracker.Message({
      type: Tracker.Message.Type.Welcome,
      id: sock.id
    });

    sock.send(new Buffer(message.serialize()));
  }.bind(this);

  var handleAnnounceMessage = function handleAnnounceMessage(message) {
    var hash = message.props.hash;
    var bytes;
    var peers;

    this.log_(sock, 'announce hash ' + hash);
    if (!this.hashes_.hasOwnProperty(hash)) {
      this.hashes_[hash] = {};
    }

    if (!this.hashes_[hash].hasOwnProperty(sock.id)) {
      this.hashes_[hash][sock.id] = {
        sock: sock,
        got: message.props.got
      };
    }

    message = new Tracker.Message({
      type: Tracker.Message.Type.Enter,
      hash: hash,
      peers: [
        {
          id: sock.id,
          got: message.props.got
        }
      ]
    });

    console.log('wwww', this.hashes_);
    bytes = new Buffer(message.serialize());
    peers = [];
    for (var peerId in this.hashes_[hash]) {
      if (!this.hashes_[hash].hasOwnProperty(peerId) ||
        peerId === sock.id) {
        continue;
      }

      var peer = this.hashes_[hash][peerId];
      peers.push(
        {
          id: peer.sock.id,
          got: peer.got
        }
      );
      console.log('send enter to', peerId);
      peer.sock.send(bytes);
    }

    message = new Tracker.Message({
      type: Tracker.Message.Type.Enter,
      hash: hash,
      peers: peers
    });
    bytes = new Buffer(message.serialize());
    sock.send(bytes);
  }.bind(this);

  var handleSDPMessage = function handleSDPMessage(message) {
    var hash = message.props.hash;
    var peerId = message.props.peer;
    var sdp = message.props.sdp;

    if (peerId === sock.id ||
      !this.hashes_.hasOwnProperty(hash) ||
      !this.hashes_[hash].hasOwnProperty(peerId)) {
      return;
    }

    for (var p in this.hashes_[hash]) {
      if (!this.hashes_[hash].hasOwnProperty(p)) {
        continue;
      }

      var peer = this.hashes_[hash][p];
      if (peer.sock.id === peerId) {
        message = new Tracker.Message({
          type: Tracker.Message.Type.SDP,
          hash: hash,
          peer: sock.id,
          sdp: sdp
        });

        var bytes = new Buffer(message.serialize());
        peer.sock.send(bytes);
        return;
      }
    }
  }.bind(this);

  var onMessage_ = function onMessage_(message) {
    var msg;
    if (message.type !== 'binary') {
      return;
    }

    msg = new Tracker.Message(new Uint8Array(message.binaryData));
    console.log(msg);

    if (msg.props.type === Tracker.Message.Type.Hello) {
      handleHelloMessage(msg);
    } else if (msg.props.type === Tracker.Message.Type.Announce) {
      handleAnnounceMessage(msg);
    } else if (msg.props.type === Tracker.Message.Type.SDP) {
      handleSDPMessage(msg);
    }
  }.bind(this);

  var onClose_ = function onClose_(reasonCode, description) {
    var hash;
    var keys;
    var peer;
    var message;
    var bytes;

    console.log('info', 'closed', {
      reasonCode: reasonCode,
      description: description
    });

    keys = Object.keys(this.hashes_);
    for (hash in this.hashes_) {
      if (!this.hashes_.hasOwnProperty(hash)) {
        continue;
      }

      if (this.hashes_[hash].hasOwnProperty(sock.id)) {
        delete this.hashes_[hash][sock.id];
      }

      if (Object.keys(this.hashes_[hash]).length < 1) {
        delete this.hashes_[hash];
        console.log('cleared', hash);
        continue;
      }

      message = new Tracker.Message({
        type: Tracker.Message.Type.Leave,
        id: sock.id,
        hash: hash
      });

      bytes = new Buffer(message.serialize());

      for (var peerId in this.hashes_[hash]) {
        if (!this.hashes_[hash].hasOwnProperty(peerId)) {
          continue;
        }

        peer = this.hashes_[hash][peerId];
        peer.sock.send(bytes);
      }
    }
  }.bind(this);

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

Tracker.Server.prototype.listen = function listen(host, port) {
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

module.exports = Tracker.Server;
