'use strict';

(function () {
  var Checksum;

  if (typeof module === 'undefined') {
    Checksum = Peeracle.Checksum;
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
      var checksum = metadata.getChecksum();
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
        //_writeUInt32(mediaSegments[m][1], buffer);
        _writeChecksum(mediaSegments[m][1], buffer);
        _writeUInt32(mediaSegments[m][1].length, buffer);
        for (var i = 0, l = mediaSegments[m][1].length; i < l; ++i) {
          //_writeUInt32(mediaSegments[m][1][i], buffer);
          _writeChecksum(mediaSegments[m][1][i], buffer);
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
