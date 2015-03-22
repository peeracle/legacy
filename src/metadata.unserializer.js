'use strict';

(function () {
  function MetadataUnserializer() {
    var _peekChar = function (bytes) {
      return bytes[0];
    };

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

    var _unserializeHeader = function (bytes) {
      var header = {};

      header.magic = _readString(bytes);
      header.version = _readUInt32(bytes);
      header.checksum = _readString(bytes);

      return header;
    };

    var _unserializeInitSegment = function (bytes) {
      var len = _readUInt32(bytes);
      return bytes.splice(0, len);
    };

    var _unserializeMediaSegments = function (bytes) {
      var segments = [];

      do {
        var segment = [];
        segment.push(_readUInt32(bytes));
        segment.push(_readUInt32(bytes));
        segment.push(_readUInt32(bytes));
        segments.push(segment);
      } while (bytes.length);

      return segments;
    };

    var unserialize = function (bytes) {
      var header = _unserializeHeader(bytes);
      var trackers = _unserializeTrackers(bytes);
      var init = _unserializeInitSegment(bytes);
      var media = _unserializeMediaSegments(bytes);

      return {
        header: header,
        trackers: trackers,
        init: init,
        media: media
      };
    };

    return {
      unserialize: unserialize
    };
  }

  module.exports = MetadataUnserializer;
})();
