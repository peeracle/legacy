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
  var byte;
  var bytes;
  var string;

  it('should create a Uint8Array', function () {
    buffer = new Uint8Array(32);
    for (var i = 0; i < 32; ++i) {
      buffer[i] = 0;
    }
    expect(buffer).not.toBeNull();
    expect(buffer.length).toEqual(32);
  });

  it('should write a random byte', function () {
    byte = Peeracle.Utils.trunc(Math.random() * 255);
    binaryStream.writeByte(byte);
  });

  it('should read a zero', function () {
    var result = binaryStream.readByte();
    expect(result).toEqual(0);
  });

  it('should read the random byte', function () {
    var result;

    binaryStream.seek(0);
    result = binaryStream.readByte();
    expect(result).toEqual(byte);
  });

  it('should write some random bytes', function () {
    var string = Math.random().toString(36).slice(2);

    bytes = new Uint8Array(string.length);
    for (var i = 0, j = string.length; i < j; ++i) {
      bytes[i] = string.charCodeAt(i);
    }

    binaryStream.seek(0);
    binaryStream.writeBytes(bytes);
  });

  it('should read the random bytes', function () {
    var result;

    binaryStream.seek(0);
    result = binaryStream.readBytes(bytes.length);
    expect(result).toEqual(bytes);
  });

  it('should write a random string', function () {
    string = Math.random().toString(36).slice(2);

    binaryStream.seek(0);
    binaryStream.writeString(string);
  });

  it('should read the random string', function () {
    var result;

    binaryStream.seek(0);
    result = binaryStream.readString();
    expect(result).toEqual(string);
  });

  it('should read the two first bytes of the random string', function () {
    var result;

    binaryStream.seek(0);
    result = binaryStream.readString(2);
    expect(result).toEqual(string.slice(0, 2));
  });
});