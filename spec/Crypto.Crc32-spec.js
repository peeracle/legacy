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
  var Peeracle = require('../index');
}

describe('Peeracle.Crypto.Crc32', function () {
  var crc32;

  beforeEach(function () {
    crc32 = Peeracle.Crypto.createInstance('crc32');
  });

  describe('init', function () {
    it('should initialize itself', function () {
      crc32.init();
      expect(crc32.crcTable_).not.toBeNull();
    });
  });

  describe('checksum', function () {
    it('should do a checksum of "hello world"', function () {
      var checksum = crc32.checksum("hello world");
      expect(checksum).toEqual(0xD4A1185);
    });
  });

  describe('update', function () {
    it('should do an incremental checksum of "hello world""', function () {
      var checksum;

      crc32.init();
      crc32.update(['h'.charCodeAt(0)]);
      crc32.update(['e'.charCodeAt(0)]);
      crc32.update(['l'.charCodeAt(0), 'l'.charCodeAt(0)]);
      crc32.update(['o'.charCodeAt(0)]);
      crc32.update([' '.charCodeAt(0)]);
      crc32.update('world');
      checksum = crc32.finish();
      expect(checksum).toEqual(0xD4A1185);
    });
  });

  describe('serialize', function () {
    it('should serialize and unserialize the checksum', function () {
      var buffer = new Uint8Array(4);
      var binaryStream = new Peeracle.BinaryStream(buffer);
      var checksum = crc32.checksum("hello world");

      expect(checksum).toEqual(0xD4A1185);
      crc32.serialize(checksum, binaryStream);
      binaryStream.seek(0);
      expect(binaryStream.readUInt32()).toEqual(0xD4A1185);
      binaryStream.seek(0);
      expect(crc32.unserialize(binaryStream)).toEqual(0xD4A1185);
    });
  });
});
