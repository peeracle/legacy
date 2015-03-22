'use strict';

(function () {
  function MetadataSerializer() {
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

    var _serializeMediaSegments = function (metadata, buffer) {
      var mediaSegments = metadata.getMediaSegments();

      for (var i = 0, len = mediaSegments.length; i < len; ++i) {
        _writeUInt32(mediaSegments[i][0], buffer);
        _writeUInt32(mediaSegments[i][1], buffer);
        _writeUInt32(mediaSegments[i][2], buffer);
      }
    };

    var _serializeInitSegment = function (metadata, buffer) {
      var initSegment = metadata.getInitSegment();

      _writeUInt32(initSegment.length, buffer);
      for (var i = 0, len = initSegment.length; i < len; ++i) {
        buffer.push(initSegment[i]);
      }
    };

    var _serializeTrackers = function (metadata, buffer) {
      var trackers = metadata.getTrackers();

      for (var t = 0; t < trackers.length; ++t) {
        _writeAsciiString(trackers[t], buffer);
      }
      _writeChar(0, buffer);
    };

    var _serializeHeader = function (metadata, buffer) {
      var header = metadata.getHeader();

      _writeAsciiString(header.magic, buffer);
      _writeUInt32(header.version, buffer);
      _writeAsciiString(header.checksum, buffer);
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
