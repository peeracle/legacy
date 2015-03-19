'use strict';

(function () {
  var _crc32Table = null;

  var Crc32 = function (array) {
    if (!_crc32Table) {
      var c;
      _crc32Table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        _crc32Table[n] = c;
      }
    }

    var crc = 0 ^ (-1);

    for (var i = 0; i < array.length; i++) {
      crc = (crc >>> 8) ^ _crc32Table[(crc ^ array[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
  };

  var Utils = {
    Crc32: Crc32
  };

  module.exports = Utils;
})();
