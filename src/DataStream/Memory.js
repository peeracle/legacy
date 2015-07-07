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
  DataStream: {}
};
// @endexclude

/**
 * @class
 * @memberof Peeracle.DataStream
 * @augments Peeracle.DataStream
 * @param {!Uint8Array} buffer
 * @constructor
 */
Peeracle.DataStream.Memory = function MemoryDataStream(buffer) {
  if (!buffer || !(buffer instanceof Uint8Array)) {
    throw new TypeError(Peeracle.DataStream.Memory.ERR_INVALID_ARGUMENT);
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

Peeracle.DataStream.Memory.ERR_INVALID_ARGUMENT = 'Invalid argument';
Peeracle.DataStream.Memory.ERR_INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
Peeracle.DataStream.Memory.ERR_VALUE_OUT_OF_BOUNDS = 'Value out of bounds';

Peeracle.DataStream.Memory.prototype.readSingle_ = function readSingle_(type) {
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

Peeracle.DataStream.Memory.prototype.writeSingle_ =
  function writeSingle_(type, value) {
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
      throw new Error(Peeracle.DataStream.Memory.ERR_INVALID_ARGUMENT);
    }

    if (!typeMap.hasOwnProperty(type)) {
      return;
    }

    if (this.offset + typeMap[type][1] > this.length) {
      throw new RangeError(Peeracle.DataStream.Memory.ERR_INDEX_OUT_OF_BOUNDS);
    }

    typeMap[type][0].bind(this.dataview_)(this.offset, value);
    this.offset += typeMap[type][1];
  };

Peeracle.DataStream.Memory.prototype.read = function read(length) {
  var bytes;

  if (typeof length !== 'number' || length < 1) {
    throw new Error(Peeracle.DataStream.Memory.ERR_INVALID_ARGUMENT);
  }

  if (length > this.length ||
    this.offset + length > this.length) {
    throw new RangeError(Peeracle.DataStream.Memory.ERR_INDEX_OUT_OF_BOUNDS);
  }

  bytes = this.bytes.subarray(this.offset, this.offset + length);
  this.offset += length;
  return bytes;
};

Peeracle.DataStream.Memory.prototype.write = function write(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(Peeracle.DataStream.Memory.ERR_INVALID_ARGUMENT);
  }

  this.bytes.set(bytes, this.offset);
  this.offset += bytes.length;
};

Peeracle.DataStream.Memory.prototype.readByte = function readByte() {
  return this.readSingle_('UInt8');
};

Peeracle.DataStream.Memory.prototype.writeByte = function writeByte(value) {
  return this.writeSingle_('UInt8', value);
};

Peeracle.DataStream.Memory.prototype.readFloat4 = function readFloat4() {
  return this.readSingle_('Float32');
};

Peeracle.DataStream.Memory.prototype.writeFloat4 = function writeFloat4(value) {
  return this.writeSingle_('Float32', value);
};

Peeracle.DataStream.Memory.prototype.readFloat8 = function readFloat8() {
  return this.readSingle_('Float64');
};

Peeracle.DataStream.Memory.prototype.writeFloat8 = function writeFloat8(value) {
  return this.writeSingle_('Float64', value);
};

Peeracle.DataStream.Memory.prototype.readInt16 = function readInt16() {
  return this.readSingle_('Int16');
};

Peeracle.DataStream.Memory.prototype.writeInt16 = function writeInt16(value) {
  return this.writeSingle_('Int16', value);
};

Peeracle.DataStream.Memory.prototype.readInt32 = function readInt32() {
  return this.readSingle_('Int32');
};

Peeracle.DataStream.Memory.prototype.writeInt32 = function writeInt32(value) {
  return this.writeSingle_('Int32', value);
};

Peeracle.DataStream.Memory.prototype.readUInt16 = function readUInt16() {
  return this.readSingle_('UInt16');
};

Peeracle.DataStream.Memory.prototype.writeUInt16 = function writeUInt16(value) {
  return this.writeSingle_('UInt16', value);
};

Peeracle.DataStream.Memory.prototype.readUInt32 = function readUInt32() {
  return this.readSingle_('UInt32');
};

Peeracle.DataStream.Memory.prototype.writeUInt32 = function writeUInt32(value) {
  return this.writeSingle_('UInt32', value);
};

/**
 * @param length
 * @returns {string}
 */
Peeracle.DataStream.Memory.prototype.readString = function readString(length) {
  var str = '';
  var bytes;
  var i;

  if (typeof length === 'number') {
    bytes = this.read(length);
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
Peeracle.DataStream.Memory.prototype.writeString = function writeString(value) {
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

  this.write(bytes);
};

/**
 *
 * @param value
 */
Peeracle.DataStream.Memory.prototype.seek = function seek(value) {
  if (typeof value !== 'number') {
    throw new TypeError(Peeracle.DataStream.Memory.ERR_INVALID_ARGUMENT);
  }
  if (value < 0 || value >= this.length) {
    throw new RangeError(Peeracle.DataStream.Memory.ERR_INDEX_OUT_OF_BOUNDS);
  }
  this.offset = value;
};

// @exclude
module.exports = Peeracle.DataStream.Memory;
// @endexclude
