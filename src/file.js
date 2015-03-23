'use strict';

(function () {
  function File(handle) {
    // @exclude
    var fs = require('fs');
    // @endexclude

    var _handle = handle;
    var _offset = 0;
    var _length = (typeof handle === 'Blob') ? handle.size : -1;

    if (typeof module !== 'undefined') {
      var stats = fs.statSync(_handle);
      _length = stats.size;
      _handle = fs.openSync(handle, 'r');
    }

    var getLength = function () {
      return _length;
    };

    var getOffset = function () {
      return _offset;
    };

    var read = function (length) {
      _offset += length;
    };

    var seek = function (position) {
      _offset = position;
    };

    // @exclude
    var _nodeFetchBytes = function (length, cb) {
      var bytes = new Buffer(length);
      var count = 0;

      fs.read(_handle, bytes, count, length, _offset, function doRead(err, bytesRead, buffer) {
        if (err) {
          throw err;
        }

        count += bytesRead;
        if (count >= length) {
          cb(new Uint8Array(bytes));
          return;
        }
        fs.read(_handle, bytes, count, length, _offset + count, doRead);
      });
    };
    // @endexclude

    var fetchBytes = function (length, cb) {
      if (_length > -1 && _offset + length > _length) {
        cb(null);
        return;
      }

      if (typeof module === 'undefined') {
        var reader = new FileReader();
        reader.onload = function (e) {
          cb(new Uint8Array(e.target.result));
        };
        reader.readAsArrayBuffer(_handle.slice(_offset, _offset + length));
      } else {
        _nodeFetchBytes(length, cb);
      }
    };

    return {
      getLength: getLength,
      getOffset: getOffset,
      fetchBytes: fetchBytes,
      read: read,
      seek: seek
    };
  }

  module.exports = File;
})();
