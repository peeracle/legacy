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
var Crypto = require('./Crypto');
var Utils = require('./Utils');
// @endexclude

/**
 * crc32 checksum algorithm implementation
 *
 * @class
 * @constructor
 * @memberof Peeracle.Crypto
 * @implements {Peeracle.Crypto}
 */
function Crc32() {
  /**
   * @type {number}
   * @private
   */
  this.crc_ = null;

  /**
   * @type {Array.<number>}
   * @private
   */
  this.crcTable_ = null;
}

Crc32.prototype = Object.create(Crypto.prototype);
Crc32.prototype.constructor = Crc32;

/** @type {string} */
Crc32.IDENTIFIER = 'crc32';

/**
 * Generate the crc32 table.
 *
 * @function
 * @private
 */
Crc32.prototype.generateCrc32Table_ = function generateCrc32Table_() {
  var c;
  var n;
  var k;

  this.crcTable_ = [];
  for (n = 0; n < 256; n++) {
    c = n;
    for (k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    this.crcTable_[n] = c;
  }
};

/**
 * Retrieve the checksum of an entire array.
 *
 * @function
 * @param array
 * @returns {*}
 */
Crc32.prototype.checksum = function checksum(array) {
  var arr = array;

  if (typeof arr === 'string') {
    arr = Utils.stringToArray(arr);
  }

  this.init();
  this.update(arr);
  return this.finish();
};

/**
 * Initialize the checksum algorithm.
 *
 * @function
 */
Crc32.prototype.init = function init() {
  if (!this.crcTable_) {
    this.generateCrc32Table_();
  }

  this.crc_ = 0 ^ (-1);
};

/**
 * Do a checksum for a partial array.
 *
 * @function
 * @param array
 */
Crc32.prototype.update = function update(array) {
  var i;
  var l;
  var arr = array;

  if (typeof arr === 'string') {
    arr = Utils.stringToArray(arr);
  }

  for (i = 0, l = arr.length; i < l; ++i) {
    this.crc_ = (this.crc_ >>> 8) ^
      this.crcTable_[(this.crc_ ^ arr[i]) & 0xFF];
  }
};

/**
 * Return the final checksum.
 *
 * @function
 * @returns {number}
 */
Crc32.prototype.finish = function finish() {
  return (this.crc_ ^ (-1)) >>> 0;
};

/**
 * Convert the checksum to bytes.
 *
 * @function
 * @param value
 * @param {BinaryStream} binaryStream
 */
Crc32.prototype.serialize = function serialize(value, binaryStream) {
  binaryStream.writeUInt32(value);
};

/**
 * Read the checksum from bytes.
 *
 * @function
 * {BinaryStream} binaryStream
 * @returns {*}
 */
Crc32.prototype.unserialize = function unserialize(binaryStream) {
  return binaryStream.readUInt32();
};

module.exports = Crc32;
