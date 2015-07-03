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
// @endexclude

/**
 * @class
 * @memberof Peeracle
 * @param {!Uint8Array} buffer
 * @constructor
 */
Peeracle.BinaryStream = function BinaryStream(buffer) {
  if (!buffer || !(buffer instanceof Uint8Array)) {
    throw new TypeError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
  }

  /**
   * @member {Uint8Array}
   */
  this.bytes = buffer;

  /**
   * @member {DataView}
   * @private
   */
  this.dataview_ = new DataView(this.bytes.buffer);

  /**
   * @member {number}
   * @private
   */
  this.length = buffer.length;

  /**
   * @member {number}
   */
  this.offset = 0;
};

Peeracle.BinaryStream.ERR_INVALID_ARGUMENT = 'Invalid argument';
Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
Peeracle.BinaryStream.ERR_VALUE_OUT_OF_BOUNDS = 'Value out of bounds';

Peeracle.BinaryStream.prototype.read = function read(type) {
  var result;
  var typeMap = {
    'Int8': [this.dataview_.getInt8, 1],
    'Int16': [this.dataview_.getInt16, 2],
    'Int32': [this.dataview_.getInt32, 4],
    'UInt8': [this.dataview_.getUint8, 1],
    'UInt16': [this.dataview_.getUint16, 2],
    'UInt32': [this.dataview_.getUint32, 4],
    'Float32': [this.dataview_.getFloat32, 4],
    'Float64': [this.dataview_.getFloat64, 8]
  };

  if (!typeMap.hasOwnProperty(type)) {
    return null;
  }

  result = typeMap[type][0].bind(this.dataview_)(this.offset);
  this.offset += typeMap[type][1];
  return result;
};

Peeracle.BinaryStream.prototype.write = function write(type, value) {
  var typeMap = {
    'Int8': [this.dataview_.setInt8, 1],
    'Int16': [this.dataview_.setInt16, 2],
    'Int32': [this.dataview_.setInt32, 4],
    'UInt8': [this.dataview_.setUint8, 1],
    'UInt16': [this.dataview_.setUint16, 2],
    'UInt32': [this.dataview_.setUint32, 4],
    'Float32': [this.dataview_.setFloat32, 4],
    'Float64': [this.dataview_.setFloat64, 8]
  };

  if (typeof value !== 'number') {
    throw new Error(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
  }

  if (!typeMap.hasOwnProperty(type)) {
    return;
  }

  if (this.offset + typeMap[type][1] > this.length) {
    throw new RangeError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }

  typeMap[type][0].bind(this.dataview_)(this.offset, value);
  this.offset += typeMap[type][1];
};

Peeracle.BinaryStream.prototype.readByte = function readByte() {
  return this.read('UInt8');
};

Peeracle.BinaryStream.prototype.writeByte = function writeByte(value) {
  return this.write('UInt8', value);
};

Peeracle.BinaryStream.prototype.readBytes = function readBytes(length) {
  var bytes;

  if (typeof length !== 'number' || length < 1) {
    throw new Error(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
  }

  if (length > this.length ||
    this.offset + length > this.length) {
    throw new RangeError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }

  bytes = this.bytes.subarray(this.offset, this.offset + length);
  this.offset += length;
  return bytes;
};

Peeracle.BinaryStream.prototype.writeBytes = function writeBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
  }

  this.bytes.set(bytes, this.offset);
  this.offset += bytes.length;
};

Peeracle.BinaryStream.prototype.readFloat4 = function readFloat4() {
  return this.read('Float32');
};

Peeracle.BinaryStream.prototype.writeFloat4 = function writeFloat4(value) {
  return this.write('Float32', value);
};

Peeracle.BinaryStream.prototype.readFloat8 = function readFloat8() {
  return this.read('Float64');
};

Peeracle.BinaryStream.prototype.writeFloat8 = function writeFloat8(value) {
  return this.write('Float64', value);
};

Peeracle.BinaryStream.prototype.readInt16 = function readInt16() {
  return this.read('Int16');
};

Peeracle.BinaryStream.prototype.writeInt16 = function writeInt16(value) {
  return this.write('Int16', value);
};

Peeracle.BinaryStream.prototype.readInt32 = function readInt32() {
  return this.read('Int32');
};

Peeracle.BinaryStream.prototype.writeInt32 = function writeInt32(value) {
  return this.write('Int32', value);
};

Peeracle.BinaryStream.prototype.readUInt16 = function readUInt16() {
  return this.read('UInt16');
};

Peeracle.BinaryStream.prototype.writeUInt16 = function writeUInt16(value) {
  return this.write('UInt16', value);
};

Peeracle.BinaryStream.prototype.readUInt32 = function readUInt32() {
  return this.read('UInt32');
};

Peeracle.BinaryStream.prototype.writeUInt32 = function writeUInt32(value) {
  return this.write('UInt32', value);
};

/**
 * @param length
 * @returns {string}
 */
Peeracle.BinaryStream.prototype.readString = function readString(length) {
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
Peeracle.BinaryStream.prototype.writeString = function writeString(value) {
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
Peeracle.BinaryStream.prototype.seek = function seek(value) {
  if (typeof value !== 'number') {
    throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
  }
  if (value < 0 || value >= this.length) {
    throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
  }
  this.offset = value;
};

// @exclude
module.exports = Peeracle.BinaryStream;
// @endexclude
