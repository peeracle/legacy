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

(function () {
  'use strict';

  /**
   * @class
   * @memberof Peeracle
   * @param {Uint8Array} buffer
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

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readByte = function () {
    if (this.offset_ >= this.length_) {
      throw 'Index out of bounds';
    }
    return this.bytes[this.offset_++];
  };

  /**
   * @param value
   */
  BinaryStream.prototype.writeByte = function (value) {
    if (this.offset_ >= this.length_) {
      throw 'Index out of bounds';
    }
    this.bytes.set([value], this.offset_++);
  };

  /**
   * @param length
   * @returns {Uint8Array}
   */
  BinaryStream.prototype.readBytes = function (length) {
    if (this.offset_ >= this.offset_ + this.length_) {
      throw 'Index out of bounds';
    }
    var bytes = this.bytes.slice(this.offset_, length);
    this.offset_ += length;
    return bytes;
  };

  /**
   * @param {Uint8Array} bytes
   */
  BinaryStream.prototype.writeBytes = function (bytes) {
    var length = bytes.length;
    if (this.offset_ >= this.offset_ + length) {
      throw 'Index out of bounds';
    }
    this.bytes.set(bytes, this.offset_);
    this.offset_ += length;
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readFloat8 = function () {
    var number = this.readBytes(8);
    var sign = (number[0] >> 7) & 0x1;
    var exponent = (((number[0] & 0x7f) << 4) |
      ((number[1] >> 4) & 0xf)) - 1023;

    var significand = 0;
    var shift = Math.pow(2, 6 * 8);
    significand += (number[1] & 0xf) * shift;
    for (var i = 2; i < 8; ++i) {
      shift = Math.pow(2, (8 - i - 1) * 8);
      significand += (number[i] & 0xff) * shift;
    }

    if (exponent > -1023) {
      if (exponent === 1024) {
        if (significand === 0) {
          if (sign === 0) {
            return Number.POSITIVE_INFINITY;
          } else {
            return Number.NEGATIVE_INFINITY;
          }
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
  BinaryStream.prototype.writeFloat8 = function (value) {
    var hiWord = 0, loWord = 0;
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
          value = -value;
        }

        var exponent = Math.floor(Math.log(value) / Math.log(2));
        var significand = Math.floor((value / Math.pow(2, exponent)) * Math.pow(2, 52));

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
  BinaryStream.prototype.readInt32 = function (unsigned) {
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
  BinaryStream.prototype.writeInt32 = function (value, unsigned) {
    var l = 0;
    var bytes = new Uint8Array(4);

    if (unsigned) {
      value = value >>> 0;
    }

    while (l < 4) {
      bytes[l] = (value & 0xFF);
      value = value >> 8;
      ++l;
    }

    this.writeBytes(bytes);
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readUInt32 = function () {
    return this.readInt32(true);
  };

  /**
   * @param {number} value
   */
  BinaryStream.prototype.writeUInt32 = function (value) {
    this.writeInt32(value, true);
  };

  /**
   * @param length
   * @returns {string}
   */
  BinaryStream.prototype.readString = function (length) {
    var str = '';
    if (length) {
      var bytes = this.readBytes(length);
      for (var i = 0; i < length; ++i) {
        str += String.fromCharCode(bytes[i]);
      }
      return str;
    }

    var c = this.readByte();
    while (c) {
      str += String.fromCharCode(c);
      c = this.readByte();
    }
    return str;
  };

  /**
   * @param {string} value
   */
  BinaryStream.prototype.writeString = function (value) {
    var length = value.length;
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; ++i) {
      bytes[i] = value.charCodeAt(i);
    }
    this.writeBytes(bytes);
  };

  module.exports = BinaryStream;
})();
