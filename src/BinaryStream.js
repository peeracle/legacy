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
   * @private
   */
  this.offset_ = 0;
}

BinaryStream.ERR_INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
BinaryStream.ERR_VALUE_OUT_OF_BOUNDS = 'Value out of bounds';

/**
 * @returns {number}
 */
BinaryStream.prototype.readByte = function readByte() {
  if (this.offset_ >= this.length_) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }
  return this.bytes[this.offset_++];
};

/**
 * @param value
 */
BinaryStream.prototype.writeByte = function writeByte(value) {
  try {
    this.bytes.set(new Uint8Array([value]), this.offset_++);
  } catch (err) {
    throw err;
  }
};

/**
 * @param length
 * @returns {Uint8Array}
 */
BinaryStream.prototype.readBytes = function readBytes(length) {
  var bytes;

  if (this.offset_ >= this.offset_ + this.length_) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }
  bytes = this.bytes.subarray(this.offset_, this.offset_ + length);
  this.offset_ += length;
  return bytes;
};

/**
 * @param {Uint8Array} bytes
 */
BinaryStream.prototype.writeBytes = function writeBytes(bytes) {
  var length = bytes.length;
  try {
    this.bytes.set(bytes, this.offset_);
    this.offset_ += length;
  } catch (err) {
    throw err;
  }
};

/**
 * @returns {number}
 */
BinaryStream.prototype.readFloat8 = function readFloat8() {
  var number = this.readBytes(8);
  var sign = (number[0] >> 7) & 0x1;
  var exponent = (((number[0] & 0x7f) << 4) |
    ((number[1] >> 4) & 0xf)) - 1023;

  var i;
  var significand = 0;
  var shift = Math.pow(2, 6 * 8);
  significand += (number[1] & 0xf) * shift;
  for (i = 2; i < 8; ++i) {
    shift = Math.pow(2, (8 - i - 1) * 8);
    significand += (number[i] & 0xff) * shift;
  }

  if (exponent > -1023) {
    if (exponent === 1024) {
      if (significand === 0) {
        if (sign === 0) {
          return Number.POSITIVE_INFINITY;
        }
        return Number.NEGATIVE_INFINITY;
      }
      return NaN;
    }
    significand += 0x10000000000000;
  } else {
    if (significand === 0) {
      return 0;
    }
    exponent = -1022;
  }

  return Math.pow(-1, sign) * (significand * Math.pow(2, -52)) *
    Math.pow(2, exponent);
};

/**
 * @param {number} value
 */
BinaryStream.prototype.writeFloat8 = function writeFloat8(value) {
  var hiWord = 0;
  var loWord = 0;
  var exponent;
  var significand;
  var val;

  switch (value) {
    case Number.POSITIVE_INFINITY:
      hiWord = 0x7FF00000;
      break;
    case Number.NEGATIVE_INFINITY:
      hiWord = 0xFFF00000;
      break;
    case +0.0:
      hiWord = 0x40000000;
      break;
    case -0.0:
      hiWord = 0xC0000000;
      break;
    default:
      if (Number.isNaN(value)) {
        hiWord = 0x7FF80000;
        break;
      }

      if (value <= -0.0) {
        hiWord = 0x80000000;
        val = -value;
      }

      exponent = Math.floor(Math.log(val) / Math.log(2));
      significand = Math.floor((val / Math.pow(2, exponent)) * Math.pow(2, 52));

      loWord = significand & 0xFFFFFFFF;
      significand /= Math.pow(2, 32);

      exponent += 1023;
      if (exponent >= 0x7FF) {
        exponent = 0x7FF;
        significand = 0;
      } else if (exponent < 0) {
        exponent = 0;
      }

      hiWord = hiWord | (exponent << 20);
      hiWord = hiWord | (significand & ~(-1 << 20));
      break;
  }

  this.writeUInt32(hiWord);
  this.writeUInt32(loWord);
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
  var bytes = new Uint8Array(4);
  var val = value;

  if (unsigned) {
    val = val >>> 0;
  }

  while (l < 4) {
    bytes[l] = (val & 0xFF);
    val = val >> 8;
    ++l;
  }

  this.writeBytes(bytes);
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

  if (length) {
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
  if (this.offset_ >= this.length_) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }
  this.offset_ = value;
};

module.exports = BinaryStream;
