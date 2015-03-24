'use strict';

(function () {
  var getIdentifier = function () {
    return 'crc32';
  };

  var _object = function () {
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

    var checksum = function (array) {
      if (!_crc32Table) {
        _generateCrc32Table();
      }

      var crc = 0 ^ (-1);

      for (var i = 0, len = array.length; i < len; i++) {
        crc = (crc >>> 8) ^ _crc32Table[(crc ^ array[i]) & 0xFF];
      }

      return (crc ^ (-1)) >>> 0;
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
        number.push(char);
      }
      return (number[0] << 24) +
        (number[1] << 16) +
        (number[2] << 8) +
        number[3] >>> 0;
    };

    return {
      checksum: checksum,
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