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

/**
 * @class
 * @memberof Peeracle
 * @param {!Uint8Array} buffer
 * @constructor
 */

function BinaryStream(buffer) {
  if (!buffer || !(buffer instanceof Uint8Array)) {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }

  /**
   * @member {Uint8Array}
   */
  this.bytes = buffer;

  /**
   * @member {number}
   * @private
   */
  this.length_ = buffer.length;

  /**
   * @member {number}
   */
  this.offset = 0;
}

BinaryStream.ERR_INVALID_ARGUMENT = 'Invalid argument';
BinaryStream.ERR_INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
BinaryStream.ERR_VALUE_OUT_OF_BOUNDS = 'Value out of bounds';

/**
 * @returns {number}
 */
BinaryStream.prototype.readByte = function readByte() {
  if (this.offset + 1 >= this.length_) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }
  return this.bytes[this.offset++];
};

/**
 * @param value
 */
BinaryStream.prototype.writeByte = function writeByte(value) {
  if (typeof value !== 'number') {
    throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
  }
  if (value < 0 || value > 255) {
    throw new Error(BinaryStream.ERR_VALUE_OUT_OF_BOUNDS);
  }
  this.bytes.set(new Uint8Array([value]), this.offset++);
};

/**
 * @param length
 * @returns {Uint8Array}
 */
BinaryStream.prototype.readBytes = function readBytes(length) {
  var bytes;

  if (typeof length !== 'number' || length < 1) {
    throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
  }

  if (length > this.length_ ||
    this.offset + length > this.length_) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }

  bytes = this.bytes.subarray(this.offset, this.offset + length);
  this.offset += length;
  return bytes;
};

/**
 * @param {Uint8Array} bytes
 */
BinaryStream.prototype.writeBytes = function writeBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }

  this.bytes.set(bytes, this.offset);
  this.offset += bytes.length;
};

/**
 * @returns {number}
 */
BinaryStream.prototype.readFloat4 = function readFloat4() {
  var i;
  var val = 0;
  var sign;
  var exponent;
  var significand;
  var number = this.readBytes(4);

  for (i = 0; i < 4; ++i) {
    val <<= 8;
    val |= number[i] & 0xff;
  }

  sign = val >> 31;
  exponent = ((val >> 23) & 0xff) - 127;
  significand = val & 0x7fffff;
  if (exponent > -127) {
    if (exponent === 128) {
      if (significand === 0) {
        if (sign === 0) {
          return Number.POSITIVE_INFINITY;
        }
        return Number.NEGATIVE_INFINITY;
      }
      return NaN;
    }
    significand |= 0x800000;
  } else {
    if (significand === 0) {
      return 0;
    }
    exponent = -126;
  }

  return Math.pow(-1, sign) * (significand * Math.pow(2, -23)) *
    Math.pow(2, exponent);
};

/**
 * @returns {number}
 */
BinaryStream.prototype.readFloat8 = function readFloat8() {
  var number = this.readBytes(8);
  var f = new Float64Array(number.buffer);
  return f[0];
};

/**
 * @param {number} value
 */
BinaryStream.prototype.writeFloat8 = function writeFloat8(value) {
  var f;
  var u;

  if (typeof value !== 'number') {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }

  f = new Float64Array([value]);
  u = new Uint8Array(f.buffer);

  this.writeBytes(u);
};

/**
 * @param {boolean?} unsigned
 * @returns {number}
 */
BinaryStream.prototype.readInt16 = function readInt16(unsigned) {
  var number = this.readBytes(2);
  var value = (number[0] << 8);

  if (unsigned) {
    return value + number[1] >>> 0;
  }

  return value + number[1];
};

/**
 * @param {boolean?} unsigned
 * @returns {number}
 */
BinaryStream.prototype.readInt32 = function readInt32(unsigned) {
  var number = this.readBytes(4);
  var value = (number[0] << 24) +
    (number[1] << 16) +
    (number[2] << 8);

  if (unsigned) {
    return value + number[3] >>> 0;
  }

  return value + number[3];
};

/**
 * @param {number} value
 * @param {boolean?} unsigned
 */
BinaryStream.prototype.writeInt32 = function writeInt32(value, unsigned) {
  var l = 0;
  var bytes;
  var val = value;

  if (typeof val !== 'number') {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }

  if (unsigned) {
    val = val >>> 0;
  } else if (val < -0x7FFFFFFF || val > 0x7FFFFFFF) {
    throw new Error(BinaryStream.ERR_VALUE_OUT_OF_BOUNDS);
  }

  bytes = [];
  while (l < 4) {
    bytes[l] = (val & 0xFF);
    val = val >> 8;
    ++l;
  }

  this.writeBytes(new Uint8Array(bytes.reverse()));
};

/**
 * @returns {number}
 */
BinaryStream.prototype.readUInt32 = function readUInt32() {
  return this.readInt32(true);
};

/**
 * @param {number} value
 */
BinaryStream.prototype.writeUInt32 = function writeUInt32(value) {
  if (typeof value !== 'number') {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }
  if (value < 0 || value > 0xFFFFFFFF) {
    throw new Error(BinaryStream.ERR_VALUE_OUT_OF_BOUNDS);
  }
  this.writeInt32(value, true);
};

/**
 * @param length
 * @returns {string}
 */
BinaryStream.prototype.readString = function readString(length) {
  var str = '';
  var bytes;
  var i;

  if (typeof length === 'number') {
    bytes = this.readBytes(length);
    for (i = 0; i < length; ++i) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  }

  i = this.readByte();
  while (i) {
    str += String.fromCharCode(i);
    i = this.readByte();
  }
  return str;
};

/**
 * @param {string} value
 */
BinaryStream.prototype.writeString = function writeString(value) {
  var i;
  var length;
  var bytes;

  if (typeof value !== 'string') {
    this.writeByte(0);
    return;
  }

  length = value.length;
  bytes = new Uint8Array(length + 1);

  for (i = 0; i < length; ++i) {
    bytes[i] = value.charCodeAt(i);
  }
  bytes[length] = 0;

  this.writeBytes(bytes);
};

/**
 *
 * @param value
 */
BinaryStream.prototype.seek = function seek(value) {
  if (typeof value !== 'number') {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }
  if (value < 0 || value >= this.length_) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }
  this.offset = value;
};

module.exports = BinaryStream;
