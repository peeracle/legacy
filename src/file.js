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
  function File(handle) {
    var _handle = handle;
    var _offset = 0;
    var _length = (typeof handle !== 'string') ? handle.size : -1;

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
    var fs = require('fs');
    var stats = fs.statSync(_handle);
    _length = stats.size;
    _handle = fs.openSync(handle, 'r');

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
