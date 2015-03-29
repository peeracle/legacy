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

  function MetadataSerializer() {
    var _checksum;

    var _writeAsciiString = function (value, buffer) {
      for (var i = 0; i < value.length; ++i) {
        var c = value.charCodeAt(i);
        buffer.push(c);
      }
      buffer.push(0);
    };

    var _writeUInt32 = function (value, buffer) {
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

    var _writeChar = function (value, buffer) {
      buffer.push(value & 0xFF);
    };

    var _writeChecksum = function (value, buffer) {
      _checksum.serialize(value, buffer);
    };

    var _serializeHeader = function (metadata, buffer) {
      var checksum = metadata.getCryptoId();
      var chunksize = metadata.getChunkSize();

      for (var c in Checksum) {
        if (Checksum[c].getIdentifier() === checksum) {
          _checksum = Checksum[c].create();
          break;
        }
      }

      if (!_checksum) {
        throw 'Unknown checksum ' + checksum;
      }

      _writeAsciiString('PRCL', buffer);
      _writeUInt32(1, buffer);
      _writeAsciiString(checksum, buffer);
      _writeUInt32(chunksize, buffer);
    };

    var _serializeTrackers = function (metadata, buffer) {
      var trackers = metadata.getTrackers();

      for (var t = 0; t < trackers.length; ++t) {
        _writeAsciiString(trackers[t], buffer);
      }
      _writeChar(0, buffer);
    };

    var _serializeInitSegment = function (metadata, buffer) {
      var initSegment = metadata.getInitSegment();

      _writeUInt32(initSegment.length, buffer);
      for (var i = 0, len = initSegment.length; i < len; ++i) {
        buffer.push(initSegment[i]);
      }
    };

    var _serializeMediaSegments = function (metadata, buffer) {
      var mediaSegments = metadata.getMediaSegments();

      for (var m in mediaSegments) {
        _writeUInt32(m, buffer);
        _writeUInt32(mediaSegments[m][0], buffer);
        _writeChecksum(mediaSegments[m][1], buffer);
        _writeUInt32(mediaSegments[m][2].length, buffer);
        for (var i = 0, l = mediaSegments[m][2].length; i < l; ++i) {
          _writeChecksum(mediaSegments[m][2][i], buffer);
        }
      }
    };

    var serialize = function (metadata) {
      var bytes = [];

      _serializeHeader(metadata, bytes);
      _serializeTrackers(metadata, bytes);
      _serializeInitSegment(metadata, bytes);
      _serializeMediaSegments(metadata, bytes);
      return bytes;
    };

    return {
      serialize: serialize
    };
  }

  module.exports = MetadataSerializer;
})();
