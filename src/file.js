'use strict';

(function () {
  function File(blob) {
    var _blob = blob;
    var _length = _blob ? _blob.size : 0;
    var _offset = 0;
    var _index = 0;
    var _buffer = null;

    var _getBytes = function (start, end, doneCallback) {
      if (!_blob) {
        doneCallback(null, 0);
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        var content = new Uint8Array(e.target.result);
        doneCallback(content, _blob.size);
      };
      reader.readAsArrayBuffer(_blob.slice(start, end));
    };

    var getIndex = function () {
      return _index;
    };

    var getBuffer = function () {
      return _buffer;
    };

    var getCurrentOffset = function () {
      return _offset + _index;
    };

    var getBytesAvailable = function () {
      return _buffer ? _buffer.length - _index : 0;
    };

    var getFileLength = function () {
      return _length;
    };

    var seek = function (offset) {
      if (_buffer && (offset >= _offset) && (offset < _offset + _buffer.length)) {
        _index = offset - _offset;
      } else {
        _offset = offset;
        _index = 0;
        _buffer = null;
      }
    };

    var read = function (size) {
      seek(getCurrentOffset() + size);
    };

    var fetchBytes = function (size, doneCallback) {
      if (size < getBytesAvailable()) {
        doneCallback(null);
        return;
      }

      var start = getCurrentOffset();
      var end = start + size;

      if (end > _length) {
        end = _length;
      }

      _getBytes(start, end, function (buf, len) {
        if (!buf) {
          doneCallback(null);
          return;
        }

        _offset = start;
        _index = getCurrentOffset() - start;
        _buffer = buf;
        _length = len;

        doneCallback(buf);
      });
    };

    var ensureEnoughBytes = function (size, doneCallback) {
      if (size < getBytesAvailable()) {
        doneCallback(false);
        return;
      }

      doneCallback(true);
    };

    return {
      getIndex: getIndex,
      getBuffer: getBuffer,
      getCurrentOffset: getCurrentOffset,
      getBytesAvailable: getBytesAvailable,
      getFileLength: getFileLength,
      read: read,
      seek: seek,
      fetchBytes: fetchBytes,
      ensureEnoughBytes: ensureEnoughBytes
    };
  }

  module.exports = File;
})();
