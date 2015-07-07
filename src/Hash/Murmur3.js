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
var Peeracle = {};
Peeracle.Hash = require('./');
Peeracle.Utils = require('./../Utils');
var murmurHash3 = require('../../third_party/murmurHash3.js/murmurHash3.js');
// @endexclude

/**
 * murmur3 checksum algorithm implementation
 *
 * @class
 * @constructor
 * @memberof Peeracle.Hash
 * @implements {Peeracle.Hash}
 */
Peeracle.Hash.Murmur3 = function Murmur3() {
  /**
   * @type {string}
   * @private
   */
  this.string_ = '';

  /**
   * @type {number}
   * @private
   */
  this.seed_ = 0x5052434C;
};

Peeracle.Hash.Murmur3.prototype = Object.create(Peeracle.Hash.prototype);
Peeracle.Hash.Murmur3.prototype.constructor = Peeracle.Hash.Murmur3;

/** @type {string} */
Peeracle.Hash.Murmur3.IDENTIFIER = 'murmur3_x86_128';

/**
 * Retrieve the checksum of an entire array.
 *
 * @function
 * @param array
 * @returns {*}
 */
Peeracle.Hash.Murmur3.prototype.checksum = function checksum(array) {
  this.init();
  this.update(array);
  return this.finish();
};

/**
 * Initialize the checksum algorithm.
 *
 * @function
 */
Peeracle.Hash.Murmur3.prototype.init = function init() {
  this.string_ = '';
};

/**
 * Do a checksum for a partial array.
 *
 * @function
 * @param array
 */
Peeracle.Hash.Murmur3.prototype.update = function update(array) {
  var i;
  var l = array.length;

  for (i = 0; i < l; ++i) {
    this.string_ += String.fromCharCode(array[i]);
  }
};

/**
 * Return the final checksum.
 *
 * @function
 * @returns {string}
 */
Peeracle.Hash.Murmur3.prototype.finish = function finish() {
  return murmurHash3.x86.hash128(this.string_, this.seed_);
};

/**
 * Convert the checksum to bytes.
 *
 * @function
 * @param {string} value
 * @param {Peeracle.DataStream} stream
 */
Peeracle.Hash.Murmur3.prototype.serialize =
  function serialize(value, stream) {
    var bytes;
    var dv;
    var i;

    if (!stream) {
      bytes = new ArrayBuffer(32);
      dv = new DataView(bytes);
      for (i = 0; i < 32; ++i) {
        dv.setUint8(i, value.charCodeAt(i));
      }
      return new Uint8Array(bytes);
    }

    for (i = 0; i < 16; ++i) {
      stream.writeByte(parseInt(value.substr(i * 2, 2), 16));
    }
  };

/**
 * Read the checksum from bytes.
 *
 * @function
 * @param {Peeracle.DataStream} stream
 * @returns {*}
 */
Peeracle.Hash.Murmur3.prototype.unserialize =
  function unserialize(stream) {
    var i;
    var str = '';

    for (i = 0; i < 16; ++i) {
      str += ('00' + stream.readByte().toString(16)).slice(-2);
    }

    return str;
  };

/**
 * Convert the checksum into a readable string.
 *
 * @function
 * @param {String} value
 * @returns {String}
 */
Peeracle.Hash.Murmur3.prototype.toString = function toString(value) {
  return value;
};

// @exclude
module.exports = Peeracle.Hash.Murmur3;
// @endexclude
