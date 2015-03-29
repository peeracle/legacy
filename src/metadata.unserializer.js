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
  var Checksum;

  if (typeof module === 'undefined') {
    Checksum = Peeracle.Crypto;
  } else {
    Checksum = require('./checksum');
  }

  function MetadataUnserializer() {
    var _checksum;

    var _readChar = function (bytes) {
      var value = bytes.splice(0, 1);
      return value[0];
    };

    var _readUInt32 = function (bytes) {
      var number = [];
      for (var i = 0; i < 4; ++i) {
        number.push(_readChar(bytes));
      }
      return (number[0] << 24) +
        (number[1] << 16) +
        (number[2] << 8) +
        number[3] >>> 0;
    };

    var _readString = function (bytes) {
      var c;
      var str = '';

      do {
        c = _readChar(bytes);
        if (!c) {
          break;
        }
        str += String.fromCharCode(c);
      } while (c);

      return str;
    };

    var _readChecksum = function (bytes) {
      var result = _checksum.unserialize(bytes);
      return result;
    };

    var _unserializeInitSegment = function (bytes) {
      var len = _readUInt32(bytes);
      return bytes.splice(0, len);
    };

    var _unserializeHeader = function (bytes) {
      var header = {};

      header.magic = _readString(bytes);
      header.version = _readUInt32(bytes);
      header.checksum = _readString(bytes);
      header.chunksize = _readUInt32(bytes);

      for (var c in Checksum) {
        if (Checksum[c].getIdentifier() === header.checksum) {
          _checksum = Checksum[c].create();
          break;
        }
      }

      if (!_checksum) {
        throw 'Unknown checksum ' + header.checksum;
      }

      return header;
    };

    var _unserializeTrackers = function (bytes) {
      var trackers = [];
      var c;

      do {
        var str = '';
        c = _readChar(bytes);
        if (!c) {
          break;
        }
        str += String.fromCharCode(c) + _readString(bytes);
        trackers.push(str);
      } while (c);

      return trackers;
    };

    var _unserializeMediaSegments = function (bytes) {
      var segments = {};

      do {
        var timecode = _readUInt32(bytes);
        var segment = [];
        var chunks = [];
        var num;

        segment.push(_readUInt32(bytes));
        segment.push(_readChecksum(bytes));

        num = _readUInt32(bytes);
        for (var i = 0; i < num; ++i) {
          chunks.push(_readChecksum(bytes));
        }
        segment.push(chunks);
        segments[timecode] = segment;
      } while (bytes.length);

      return segments;
    };

    var unserialize = function (bytes, metadata) {
      var header = _unserializeHeader(bytes);
      var trackers = _unserializeTrackers(bytes);
      var init = _unserializeInitSegment(bytes);
      var media = _unserializeMediaSegments(bytes);

      metadata.setCryptoId(header.checksum);
      metadata.setChunkSize(header.chunksize);
      metadata.setTrackers(trackers);
      metadata.setInitSegment(init);
      metadata.setMediaSegments(media);
    };

    return {
      unserialize: unserialize
    };
  }

  module.exports = MetadataUnserializer;
})();
