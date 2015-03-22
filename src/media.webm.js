'use strict';

(function () {
  var getFileHeader = function () {
    return [0x1A, 0x45, 0xDF, 0xA3];
  };

  var _object = function (file) {
    var _file = file;
    var _cluster = null;

    var _readVariableInt = function (buffer, start, maxSize) {
      var length;
      var readBytes = 1;
      var lengthMask = 0x80;
      var n = 1;

      length = buffer[start];
      if (!length) {
        return null;
      }

      while (readBytes <= maxSize && !(length & lengthMask)) {
        readBytes++;
        lengthMask >>= 1;
      }

      if (readBytes > maxSize) {
        return null;
      }

      length &= ~lengthMask;
      while (n++ < readBytes) {
        length = (length << 8) | buffer[++start];
      }

      return {
        length: readBytes,
        value: length
      };
    };

    var _readBufferedTag = function (start, buffer) {
      var result = _readVariableInt(buffer, start, 4);
      var tag = {};

      tag.id = result.value | (1 << (7 * result.length));
      tag.str = tag.id.toString(16);
      tag.headerSize = result.length;

      result = _readVariableInt(buffer, start + tag.headerSize, 8);
      tag.dataSize = result.value;
      tag.headerSize += result.length;
      return tag;
    };

    var _readTag = function (doneCallback) {
      var headerOffset = _file.getOffset();

      _file.fetchBytes(12, function (bytes) {
        if (!bytes) {
          doneCallback(null);
          return;
        }

        var tag = _readBufferedTag(0, bytes);
        _file.read(tag.headerSize);
        tag.headerOffset = headerOffset;
        doneCallback(tag);
      });
    };

    var _readUInt = function (buf, start, size) {
      if (size < 1 || size > 8) {
        return null;
      }

      var val = 0;
      for (var i = 0; i < size; ++i) {
        val <<= 8;
        val |= buf[start + i] & 0xff;
      }

      return val;
    };

    var _readTagBytes = function (tag, doneCallback) {
      _file.seek(tag.headerOffset);
      _file.fetchBytes(tag.headerSize + tag.dataSize, function (bytes) {
        if (!bytes) {
          doneCallback(null);
          return;
        }

        _file.read(tag.headerSize + tag.dataSize);
        doneCallback(bytes);
      });
    };

    var _getClusterTimecode = function (buffer) {
      var start = 0;
      var tag = _readBufferedTag(start, buffer);
      if (tag.str !== '1f43b675') {
        return null;
      }

      start = tag.headerSize;
      tag = _readBufferedTag(start, buffer);
      if (tag.str !== 'e7') {
        return null;
      }

      start += tag.headerSize;
      return _readUInt(buffer, start, tag.dataSize);
    };

    var getInitSegment = function (doneCallback) {
      _readTag(function (ebml) {
        if (ebml.str !== '1a45dfa3') {
          doneCallback(null);
          return;
        }

        _file.read(ebml.dataSize);
        _readTag(function processTag(tag) {
          if (tag.str === '1f43b675') {
            _cluster = tag;
            ebml.dataSize = tag.headerOffset - ebml.headerSize;
            _readTagBytes(ebml, function (bytes) {
              doneCallback(bytes);
            });
            return;
          }

          if (tag.str !== '18538067') {
            _file.read(tag.dataSize);
          }

          _readTag(processTag);
        });
      });
    };

    var getNextMediaSegment = function (doneCallback) {
      if (_cluster == null) {
        doneCallback(null);
        return;
      }

      _readTagBytes(_cluster, function (bytes) {
        _readTag(function (tag) {
          if (!tag || tag.str !== '1f43b675') {
            _cluster = null;
          } else {
            _cluster = tag;
          }

          doneCallback({
            timecode: _getClusterTimecode(bytes),
            bytes: bytes
          });
        });
      });
    };

    return {
      getInitSegment: getInitSegment,
      getNextMediaSegment: getNextMediaSegment
    };
  };

  var create = function (file) {
    return new _object(file);
  };

  var Media = {
    WebM: {
      getFileHeader: getFileHeader,
      create: create
    }
  };

  module.exports = Media.WebM;
})();
