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
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
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

(function () {
  var getIdentifier = function () {
    return 'crc32';
  };

  var _object = function () {
    var _crc;
    var _crc32Table = null;

    var _generateCrc32Table = function () {
      var c;
      _crc32Table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        _crc32Table[n] = c;
      }
    };

    var init = function () {
      if (!_crc32Table) {
        _generateCrc32Table();
      }

      _crc = 0 ^ (-1);
    };

    var update = function (array) {
      for (var i = 0, len = array.length; i < len; i++) {
        _crc = (_crc >>> 8) ^ _crc32Table[(_crc ^ array[i]) & 0xFF];
      }
    };

    var final = function () {
      return (_crc ^ (-1)) >>> 0;
    };

    var checksum = function (array) {
      init();
      update(array);
      return final();
    };

    var serialize = function (value, buffer) {
      var l = 0;
      var bytes = [];

      value = value >>> 0;
      while (l < 4) {
        bytes.push(value & 0xFF);
        value = value >> 8;
        ++l;
      }

      bytes = bytes.reverse();
      for (var i = 0; i < bytes.length; ++i) {
        buffer.push(bytes[i]);
      }
    };

    var unserialize = function (bytes) {
      var number = [];
      for (var i = 0; i < 4; ++i) {
        var char = bytes.splice(0, 1);
        number.push(char[0]);
      }
      return (number[0] << 24) +
        (number[1] << 16) +
        (number[2] << 8) +
        number[3] >>> 0;
    };

    return {
      checksum: checksum,
      init: init,
      update: update,
      final: final,
      serialize: serialize,
      unserialize: unserialize
    };
  };

  var create = function () {
    return new _object();
  };

  var Checksum = {
    Crc32: {
      getIdentifier: getIdentifier,
      create: create
    }
  };
  module.exports = Checksum.Crc32;
})();
