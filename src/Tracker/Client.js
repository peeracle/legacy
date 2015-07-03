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

// @exclude
var Listenable = require('./../Listenable');
var WebSocket = require('websocket').w3cwebsocket;
var Peeracle = {
  Tracker: require('./')
};
// @endexclude

/**
 * @class
 * @memberof Peeracle.Tracker
 * @augments Listenable
 * @constructor
 *
 * @property {string} url_
 * @property {WebSocket} ws_
 */
Peeracle.Tracker.Client = function Client() {
  this.url_ = null;
  this.ws_ = null;

  Listenable.call(this);
};

Peeracle.Tracker.Client.prototype = Object.create(Listenable.prototype);
Peeracle.Tracker.Client.prototype.constructor = Peeracle.Tracker.Client;

/**
 * Callback triggered once the connection has been established.
 * @private
 */
Peeracle.Tracker.Client.prototype.onOpen_ = function onOpen_() {
  var msg = new Peeracle.Tracker.Message({
    type: Peeracle.Tracker.Message.Type.Hello
  });
  var bytes = msg.serialize();
  console.log('[Peeracle.Tracker.Client] onOpen', bytes);
  this.ws_.send(bytes);
};

/**
 * Callback triggered once a message has been received.
 * @param {MessageEvent} e
 * @private
 */
Peeracle.Tracker.Client.prototype.onMessage_ = function onMessage_(e) {
  var data = new Uint8Array(e.data);
  var msg = new Peeracle.Tracker.Message(data);
  var typeMap = {};

  if (!msg.hasOwnProperty('props') || !msg.props.hasOwnProperty('type')) {
    return;
  }

  typeMap[Peeracle.Tracker.Message.Type.Welcome] = function welcomeMsg(m) {
    this.emit('connect', m.props.id);
  }.bind(this);

  typeMap[Peeracle.Tracker.Message.Type.Enter] = function enterMsg(m) {
    this.emit('enter', m.props.hash, m.props.peers);
  }.bind(this);

  typeMap[Peeracle.Tracker.Message.Type.Leave] = function leaveMsg(m) {
    this.emit('leave', m.props.hash, m.props.id);
  }.bind(this);

  typeMap[Peeracle.Tracker.Message.Type.SDP] = function sdpMsg(m) {
    this.emit('sdp', m.props.hash, m.props.peer, m.props.sdp);
  }.bind(this);

  if (!typeMap.hasOwnProperty(msg.props.type)) {
    return;
  }

  typeMap[msg.props.type](msg);
};

/**
 * Callback triggered once an error occurs.
 * @param {ErrorEvent} e
 * @private
 */
Peeracle.Tracker.Client.prototype.onError_ = function onError_(e) {
  console.log('[Peeracle.Tracker.Client] onError', e.type);
};

/**
 * Callback triggered once the connection to the tracker is lost.
 * @param {CloseEvent} e
 * @private
 */
Peeracle.Tracker.Client.prototype.onClose_ = function onClose_(e) {
  var code = e.code;
  var reason = e.reason;
  console.log('[Peeracle.Tracker.Client] onClose', code, reason);
};

/**
 * Connect to the tracker.
 * @param {string} url
 */
Peeracle.Tracker.Client.prototype.connect = function connect(url) {
  this.url_ = url;

  this.ws_ = new WebSocket(this.url_, 'prcl-0.0.1');
  this.ws_.binaryType = 'arraybuffer';
  this.ws_.onopen = this.onOpen_.bind(this);
  this.ws_.onmessage = this.onMessage_.bind(this);
  this.ws_.onerror = this.onError_.bind(this);
  this.ws_.onclose = this.onClose_.bind(this);
};

/**
 * Send an announcement to the tracker.
 * @param {Peeracle.Metadata} metadata
 * @param {Array.<number>} got
 */
Peeracle.Tracker.Client.prototype.announce = function announce(metadata, got) {
  /** @type {Peeracle.Tracker.Message} */
  var msg = new Peeracle.Tracker.Message({
    type: Peeracle.Tracker.Message.Type.Announce,
    hash: metadata.getId(),
    got: got
  });
  var bytes = msg.serialize();
  console.log('[Peeracle.Tracker.Client] announce', bytes);
  this.ws_.send(bytes);
};

Peeracle.Tracker.Client.prototype.sendSdp =
  function sendSdp(hash, peerId, sdp) {
    var msg = new Peeracle.Tracker.Message({
      type: Peeracle.Tracker.Message.Type.SDP,
      hash: hash,
      peer: peerId,
      sdp: sdp
    });
    this.ws_.send(msg.serialize());
  };

/**
 * Close the connection to the tracker.
 */
Peeracle.Tracker.Client.prototype.close = function close() {
  this.ws_.close();
};

// @exclude
module.exports = Peeracle.Tracker.Client;
// @endexclude
