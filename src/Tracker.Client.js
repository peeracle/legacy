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
var Listenable = require('./Listenable');
var WebSocket = require('websocket').w3cwebsocket;
// @endexclude

/**
 * @class
 * @memberof Peeracle.Tracker
 * @augments Listenable
 * @constructor
 */
function Client() {
  this.url_ = null;
  this.ws_ = null;
}

Client.prototype = Object.create(Listenable.prototype);
Client.prototype.constructor = Client;

Client.prototype.onOpen_ = function onOpen_() {
  console.log('[Peeracle.Tracker.Client] onOpen');
  this.ws_.send(new Uint8Array([0, 0]));
};

Client.prototype.onMessage_ = function onMessage_(e) {
  var data = e.data;
  console.log('[Peeracle.Tracker.Client] onMessage', data);
};

Client.prototype.onError_ = function onError_() {
  console.log('[Peeracle.Tracker.Client] onError');
};

Client.prototype.onClose_ = function onClose_(e) {
  var code = e.code;
  var reason = e.reason;
  console.log('[Peeracle.Tracker.Client] onClose', code, reason);
};

Client.prototype.connect = function connect(url) {
  this.url_ = url;

  this.ws_ = new WebSocket(this.url_, 'prcl-0.0.1', this.url_);
  this.ws_.onopen = this.onOpen_.bind(this);
  this.ws_.onmessage = this.onMessage_.bind(this);
  this.ws_.onerror = this.onError_.bind(this);
  this.ws_.onclose = this.onClose_.bind(this);
};

module.exports = Client;
