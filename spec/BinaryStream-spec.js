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

/* eslint-disable */
'use strict';

if (typeof Peeracle === 'undefined') {
  var Peeracle = require('../peeracle');
}

describe('BinaryStream', function () {
  var buffer = new Uint8Array(32);
  var binaryStream = new Peeracle.BinaryStream(buffer);

  it('should create a Uint8Array', function () {
    buffer = new Uint8Array(32);
    for (var i = 0; i < 32; ++i) {
      buffer[i] = 0;
    }
    expect(buffer).not.toBeNull();
    expect(buffer.length).toEqual(32);
  });

  it('should write and read a random byte', function () {
    var byte = Peeracle.Utils.trunc(Math.random() * 255);
    binaryStream.writeByte(byte);
    binaryStream.seek(0);
    var result = binaryStream.readByte();
    expect(result).toEqual(byte);
  });

  xit('should throw an error for byte overflow');

  it('should read a zero', function () {
    var result = binaryStream.readByte();
    expect(result).toEqual(0);
  });

  it('should write and read some random bytes', function () {
    var result;
    var length = Peeracle.Utils.trunc(Math.random() * 32 + 1);
    var bytes = new Uint8Array(length);

    for (var i = 0; i < length; ++i) {
      bytes[i] = Peeracle.Utils.trunc(Math.random() * 255);
    }

    binaryStream.seek(0);
    binaryStream.writeBytes(bytes);
    binaryStream.seek(0);
    result = binaryStream.readBytes(length);
    expect(result).toEqual(bytes);
  });

  it('should write and read a random string', function () {
    var result;
    var string = Math.random().toString(36).slice(2, 16);

    binaryStream.seek(0);
    binaryStream.writeString(string);

    binaryStream.seek(0);
    result = binaryStream.readString();
    expect(result).toEqual(string);

    binaryStream.seek(0);
    result = binaryStream.readString(2);
    expect(result).toEqual(string.slice(0, 2));

    binaryStream.seek(0);
    result = binaryStream.readString(4);
    expect(result).toEqual(string.slice(0, 4));

    binaryStream.seek(4);
    result = binaryStream.readString(6);
    expect(result).toEqual(string.slice(4, 10));
  });

  it('should write and read a random unsigned integer', function () {
    var result;
    var value = Math.floor((Math.random() * 0xFFFFFFFF - 0x7FFFFFFF + 1) +
      0x7FFFFFFF);

    binaryStream.seek(0);
    binaryStream.writeUInt32(value);

    binaryStream.seek(0);
    result = binaryStream.readUInt32();

    expect(result).toEqual(value);
  });

  xit('should throw an error for unsigned integer overflow');

  it('should write and read the random signed integer', function () {
    var result;
    var value = Math.floor(Math.random() * 0x7FFFFFFF);

    binaryStream.seek(0);
    binaryStream.writeInt32(value);
    binaryStream.seek(0);
    result = binaryStream.readInt32();
    expect(result).toEqual(value);
  });

  xit('should throw an error for signed integer overflow');

  it('should write and read a random double', function () {
    var result;
    var value = Math.random() * 0x7FFFFFFF;

    binaryStream.seek(0);
    binaryStream.writeFloat8(value);
    binaryStream.seek(0);
    result = binaryStream.readFloat8();
    expect(result).toEqual(value);
  });
});