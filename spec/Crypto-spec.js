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

describe('Peeracle.Crypto', function () {
  describe('createInstance', function () {
    it('should throw an error passing an invalid argument', function () {
      expect(function () {
        Peeracle.Crypto.createInstance(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        Peeracle.Crypto.createInstance(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        Peeracle.Crypto.createInstance([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        Peeracle.Crypto.createInstance(new Uint8Array(1));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });
    it('should return null on a non-existing crypto algorithm', function () {
      expect(Peeracle.Crypto.createInstance('')).toBeNull();
      expect(Peeracle.Crypto.createInstance('iDontExist')).toBeNull();
    });
    it('should return an instance of Peeracle.Crypto.Crc32', function () {
      var crc32 = Peeracle.Crypto.createInstance('crc32');
      expect(crc32).not.toBeNull();
      expect(crc32).toEqual(jasmine.any(Peeracle.Crypto.Crc32));
      expect(crc32).toEqual(jasmine.any(Peeracle.Crypto));
    });
  });
});
