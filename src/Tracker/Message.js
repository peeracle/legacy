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
  BinaryStream: require('./../BinaryStream'),
  Tracker: require('./')
};
// @endexclude

/**
 * @typedef {Object} TrackerPeer
 * @property {string} id
 * @property {Array.<Number>} got
 */

/**
 * @class
 * @memberof {Peeracle.Tracker}
 * @param {?Uint8Array} parm
 * @constructor
 *
 * @property {Object.<string, *>} props
 */
Peeracle.Tracker.Message = function Message(parm) {
  this.props = {};

  if (parm instanceof Uint8Array) {
    this.unserialize_(parm);
  } else if (typeof parm === 'object') {
    this.createFromObject_(parm);
  }
};

/**
 * Enum for tracker message types.
 * @readonly
 * @enum {number}
 */
Peeracle.Tracker.Message.Type = {
  None: 0,
  Hello: 1,
  Welcome: 2,
  Announce: 3,
  Enter: 4,
  Leave: 5,
  SDP: 6
};

/**
 * Create a new tracker message from an object.
 * @param {Object.<string, *>} obj
 * @private
 */
Peeracle.Tracker.Message.prototype.createFromObject_ =
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
 * Serialize a Hello message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Tracker.Message.prototype.serializeHello_ =
  function serializeHello_() {
    return new Uint8Array([]);
  };

/**
 * Serialize a Welcome message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Tracker.Message.prototype.serializeWelcome_ =
  function serializeWelcome_() {
    /** @type {Uint8Array} */
    var bytes = new Uint8Array(this.props.id.length + 1);

    /** @type {Peeracle.BinaryStream} */
    var bstream = new Peeracle.BinaryStream(bytes);
    bstream.writeString(this.props.id);

    return bytes;
  };

/**
 * Serialize a Announce message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Tracker.Message.prototype.serializeAnnounce_ =
  function serializeAnnounce_() {
    var g;
    var bytes;
    var length = 0;
    var bstream;

    length += this.props.hash.length + 1;
    length += this.props.got.length * 4;

    bytes = new Uint8Array(length);
    bstream = new Peeracle.BinaryStream(bytes);
    bstream.writeString(this.props.hash);

    for (g = 0; g < this.props.got.length; ++g) {
      bstream.writeUInt32(this.props.got[g]);
    }

    return bytes;
  };

/**
 * Serialize a Enter message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Tracker.Message.prototype.serializeEnter_ =
  function serializeEnter_() {
    var length = 0;
    var bytes;
    var bstream;
    var g;
    var p;

    /** @type {TrackerPeer} */
    var peer;

    length += this.props.hash.length + 1;
    length += 1;
    for (p = 0; p < this.props.peers.length; ++p) {
      peer = this.props.peers[p];
      length += peer.id.length + 1;
      length += 1;
      length += peer.got.length * 4;
    }

    bytes = new Uint8Array(length);
    bstream = new Peeracle.BinaryStream(bytes);
    bstream.writeString(this.props.hash);
    bstream.writeByte(this.props.peers.length);
    for (p = 0; p < this.props.peers.length; ++p) {
      peer = this.props.peers[p];
      bstream.writeString(peer.id);
      bstream.writeByte(peer.got.length);
      for (g = 0; g < peer.got.length; ++g) {
        bstream.writeUInt32(peer.got[g]);
      }
    }

    return bytes;
  };

/**
 * Serialize a Leave message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Tracker.Message.prototype.serializeLeave_ =
  function serializeLeave_() {
    var length = 0;
    var bytes;
    var bstream;

    length += this.props.id.length + 1;
    length += this.props.hash.length + 1;

    bytes = new Uint8Array(length);
    bstream = new Peeracle.BinaryStream(bytes);
    bstream.writeString(this.props.id);
    bstream.writeString(this.props.hash);

    return bytes;
  };

/**
 * Serialize a SDP message.
 * @returns {Uint8Array}
 * @private
 */
Peeracle.Tracker.Message.prototype.serializeSDP_ =
  function serializeSDP_() {
    var length = 0;
    var bytes;
    var bstream;

    length += this.props.hash.length + 1;
    length += this.props.peer.length + 1;
    length += this.props.sdp.length + 1;

    bytes = new Uint8Array(length);
    bstream = new Peeracle.BinaryStream(bytes);
    bstream.writeString(this.props.hash);
    bstream.writeString(this.props.peer);
    bstream.writeString(this.props.sdp);

    return bytes;
  };

/**
 * Serialize a message.
 * @returns {Uint8Array}
 */
Peeracle.Tracker.Message.prototype.serialize =
  function serialize() {
    var bytes;
    var result;
    var typeMap = {};

    typeMap[Peeracle.Tracker.Message.Type.Hello] = this.serializeHello_;
    typeMap[Peeracle.Tracker.Message.Type.Welcome] = this.serializeWelcome_;
    typeMap[Peeracle.Tracker.Message.Type.Announce] = this.serializeAnnounce_;
    typeMap[Peeracle.Tracker.Message.Type.Enter] = this.serializeEnter_;
    typeMap[Peeracle.Tracker.Message.Type.Leave] = this.serializeLeave_;
    typeMap[Peeracle.Tracker.Message.Type.SDP] = this.serializeSDP_;

    if (!typeMap.hasOwnProperty(this.props.type)) {
      return null;
    }

    result = typeMap[this.props.type].bind(this)();
    bytes = new Uint8Array(result.length + 1);
    bytes.set(new Uint8Array([this.props.type]), 0);
    bytes.set(result, 1);
    return bytes;
  };

Peeracle.Tracker.Message.prototype.unserializeHello_ =
  function unserializeHello_() {
  };

Peeracle.Tracker.Message.prototype.unserializeWelcome_ =
  function unserializeWelcome_(bstream) {
    this.props.id = bstream.readString();
  };

Peeracle.Tracker.Message.prototype.unserializeAnnounce_ =
  function unserializeAnnounce_(bstream) {
    this.props.hash = bstream.readString();
    this.props.got = [];
    console.log('unserialized announce:', bstream.offset, bstream.length);
    while (bstream.offset < bstream.length) {
      this.props.got.push(bstream.readUInt32());
    }
  };

Peeracle.Tracker.Message.prototype.unserializeEnter_ =
  function unserializeEnter_(bstream) {
    var gotLength;
    var g;
    var p;
    var peer;
    var peerCount;

    this.props.hash = bstream.readString();
    this.props.peers = [];
    peerCount = bstream.readByte();
    for (p = 0; p < peerCount; ++p) {
      peer = {};
      peer.id = bstream.readString();
      peer.got = [];
      gotLength = bstream.readByte();
      for (g = 0; g < gotLength; ++g) {
        peer.got.push(bstream.readUInt32());
      }
      this.props.peers.push(peer);
    }
  };

Peeracle.Tracker.Message.prototype.unserializeLeave_ =
  function unserializeLeave_(bstream) {
    this.props.id = bstream.readString();
    this.props.hash = bstream.readString();
  };

Peeracle.Tracker.Message.prototype.unserializeSDP_ =
  function unserializeSDP_(bstream) {
    this.props.hash = bstream.readString();
    this.props.peer = bstream.readString();
    this.props.sdp = bstream.readString();
  };

Peeracle.Tracker.Message.prototype.unserialize_ =
  function unserialize_(bytes) {
    var bstream = new Peeracle.BinaryStream(bytes);
    var typeMap = {};

    typeMap[Peeracle.Tracker.Message.Type.Hello] = this.unserializeHello_;
    typeMap[Peeracle.Tracker.Message.Type.Welcome] = this.unserializeWelcome_;
    typeMap[Peeracle.Tracker.Message.Type.Announce] = this.unserializeAnnounce_;
    typeMap[Peeracle.Tracker.Message.Type.Enter] = this.unserializeEnter_;
    typeMap[Peeracle.Tracker.Message.Type.Leave] = this.unserializeLeave_;
    typeMap[Peeracle.Tracker.Message.Type.SDP] = this.unserializeSDP_;

    this.props.type = bstream.readByte();
    if (!typeMap.hasOwnProperty(this.props.type)) {
      return null;
    }

    typeMap[this.props.type].bind(this)(bstream);
  };

// @exclude
module.exports = Peeracle.Tracker.Message;
// @endexclude
