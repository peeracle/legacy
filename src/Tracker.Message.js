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
var BinaryStream = require('./BinaryStream');
// @endexclude

/**
 * @class
 * @param {Uint8Array?} parm
 * @constructor
 */
function Message(parm) {
  this.props = {};

  if (parm instanceof Uint8Array) {
    this.unserialize_(parm);
  } else if (typeof parm === 'object') {
    this.createFromObject_(parm);
  }
}

/**
 * @enum {number}
 */
Message.Type = {
  None: 0,
  Hello: 1,
  Welcome: 2
};

Message.prototype.createFromObject_ = function createFromObject_(obj) {
  var k;

  for (k in obj) {
    if (!obj.hasOwnProperty(k)) {
      continue;
    }
    this.props[k] = obj[k];
  }
};

Message.prototype.serializeHello_ = function serializeHello_() {
  return new Uint8Array([Message.Type.Hello]);
};

Message.prototype.serializeWelcome_ = function serializeWelcome_() {
  var bytes = new Uint8Array(5);
  var bstream = new BinaryStream(bytes);

  bstream.writeByte(Message.Type.Welcome);
  bstream.writeUInt32(this.props.id);
  return bytes;
};

Message.prototype.serialize = function serialize() {
  var typeMap = {};

  typeMap[Message.Type.Hello] = this.serializeHello_;
  typeMap[Message.Type.Welcome] = this.serializeWelcome_;

  if (!typeMap.hasOwnProperty(this.props.type)) {
    return null;
  }

  return typeMap[this.props.type].bind(this)();
};

Message.prototype.unserializeHello_ = function unserializeHello_(bstream) {
};

Message.prototype.unserializeWelcome_ = function unserializeWelcome_(bstream) {
  this.props.id = bstream.readUInt32();
};

Message.prototype.unserialize_ = function unserialize_(bytes) {
  var bstream = new BinaryStream(bytes);
  var typeMap = {};

  typeMap[Message.Type.Hello] = this.unserializeHello_;
  typeMap[Message.Type.Welcome] = this.unserializeWelcome_;

  this.props.type = bstream.readByte();
  if (!typeMap.hasOwnProperty(this.props.type)) {
    return null;
  }

  typeMap[this.props.type].bind(this)(bstream);
};

module.exports = Message;
