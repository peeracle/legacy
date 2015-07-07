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
var Peeracle = {
  DataStream: require('./../DataStream'),
  Peer: {}
};
// @endexclude

/**
 * @class
 * @memberof {Peeracle.Peer}
 * @param {?Uint8Array} parm
 * @constructor
 *
 * @property {Object.<string, *>} props
 */
Peeracle.Peer.Message = function Message(parm) {
  this.props = {};

  if (parm instanceof Uint8Array) {
    this.unserialize_(parm);
  } else if (typeof parm === 'object') {
    this.createFromObject_(parm);
  }
};

/**
 * Enum for peer message types.
 * @readonly
 * @enum {number}
 */
Peeracle.Peer.Message.Type = {
  None: 0,
  Ping: 1,
  Request: 2
};

/**
 * Create a new peer message from an object.
 * @param {Object.<string, *>} obj
 * @private
 */
Peeracle.Peer.Message.prototype.createFromObject_ =
  function createFromObject_(obj) {
    /** @type {string} */
    var k;

    for (k in obj) {
      if (!obj.hasOwnProperty(k)) {
        continue;
      }
      this.props[k] = obj[k];
    }
  };

/**
 * Serialize a Ping message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Peer.Message.prototype.serializePing_ =
  function serializeHello_() {
    /** @type {Uint8Array} */
    var bytes = new Uint8Array(1);

    /** @type {Peeracle.DataStream.Memory} */
    var stream = new Peeracle.DataStream.Memory(bytes);

    stream.writeByte(this.props.reply);
    return bytes;
  };

/**
 * Serialize a Request message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Peer.Message.prototype.serializeRequest_ =
  function serializeHello_() {
    var length = this.props.hash.length + 1 + 4 + 4;

    /** @type {Uint8Array} */
    var bytes = new Uint8Array(length);

    /** @type {Peeracle.DataStream.Memory} */
    var stream = new Peeracle.DataStream.Memory(bytes);

    stream.writeString(this.props.hash);
    stream.writeUInt32(this.props.cluster);
    stream.writeUInt32(this.props.chunk);
    return bytes;
  };

/**
 * Serialize a message.
 * @returns {Uint8Array}
 */
Peeracle.Peer.Message.prototype.serialize =
  function serialize() {
    var bytes;
    var result;
    var typeMap = {};

    typeMap[Peeracle.Peer.Message.Type.Ping] = this.serializePing_;
    typeMap[Peeracle.Peer.Message.Type.Request] = this.serializeRequest_;

    if (!typeMap.hasOwnProperty(this.props.type)) {
      return null;
    }

    result = typeMap[this.props.type].bind(this)();
    bytes = new Uint8Array(result.length + 1);
    bytes.set(new Uint8Array([this.props.type]), 0);
    bytes.set(result, 1);
    return bytes;
  };

Peeracle.Peer.Message.prototype.unserializePing_ =
  function unserializePing_(bstream) {
    this.props.reply = bstream.readByte();
  };

Peeracle.Peer.Message.prototype.unserializeRequest_ =
  function unserializeRequest_(bstream) {
    this.props.hash = bstream.readString();
    this.props.cluster = bstream.readUInt32();
    this.props.chunk = bstream.readUInt32();
  };

Peeracle.Peer.Message.prototype.unserialize_ =
  function unserialize_(bytes) {
    var stream = new Peeracle.DataStream.Memory(bytes);
    var typeMap = {};

    typeMap[Peeracle.Peer.Message.Type.Ping] = this.unserializePing_;
    typeMap[Peeracle.Peer.Message.Type.Request] = this.unserializeRequest_;

    this.props.type = stream.readByte();
    if (!typeMap.hasOwnProperty(this.props.type)) {
      return null;
    }

    typeMap[this.props.type].bind(this)(stream);
  };

// @exclude
module.exports = Peeracle.Peer.Message;
// @endexclude
