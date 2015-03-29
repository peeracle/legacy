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
  var Crypto;

  if (typeof module === 'undefined') {
    Crypto = Peeracle.Crypto;
  } else {
    Crypto = require('./crypto');
  }

  function Metadata() {
    var _id;
    var _crypto;
    var _cryptoId = 'crc32';
    var _chunksize = 0;
    var _trackers = [];
    var _initSegment = [];
    var _mediaSegments = [];

    var _loadCrypto = function () {
      for (var c in Crypto) {
        if (Crypto[c].getIdentifier() === _cryptoId) {
          _crypto = Crypto[c].create();
          break;
        }
      }

      if (!_crypto) {
        throw 'Unknown checksum ' + _cryptoId;
      }
    };

    var getId = function () {
      if (!_id) {
        if (!_crypto) {
          _loadCrypto();
        }

        _crypto.init();
        _crypto.update(_initSegment);
        for (var m in _mediaSegments) {
          _crypto.update([_mediaSegments[m][1]]);
          for (var c = 0, l = _mediaSegments[m][2].length; c < l; ++c) {
            _crypto.update([_mediaSegments[m][2][c]]);
          }
        }
        _id = _crypto.final();
      }
      return _id;
    };

    var getCryptoId = function () {
      return _cryptoId;
    };

    var getChunkSize = function () {
      return _chunksize;
    };

    var getTrackers = function () {
      return _trackers;
    };

    var getInitSegment = function () {
      return _initSegment;
    };

    var getMediaSegments = function () {
      return _mediaSegments;
    };

    var setCryptoId = function (checksum) {
      _cryptoId = checksum;
    };

    var setChunkSize = function (chunksize) {
      _chunksize = chunksize;
    };

    var setTrackers = function (trackers) {
      _trackers = trackers;
    };

    var setInitSegment = function (initSegment) {
      _initSegment = initSegment;
    };

    var setMediaSegments = function (mediaSegments) {
      _mediaSegments = mediaSegments;
    };

    var addMediaSegment = function (timecode, mediaSegment) {
      var clusterLength = mediaSegment.length;
      var chunkLength = _chunksize;

      if (!_crypto) {
        _loadCrypto();
      }

      var cluster = {
        timecode: timecode,
        length: clusterLength,
        checksum: _crypto.checksum(mediaSegment),
        chunks: []
      };

      for (var i = 0; i < clusterLength; i += chunkLength) {
        var chunk = mediaSegment.subarray(i, i + chunkLength);

        cluster.chunks.push(_crypto.checksum(chunk));

        if (clusterLength - i < chunkLength) {
          chunkLength = clusterLength - i;
        }
      }

      _mediaSegments.push(cluster);
    };

    var validateMediaSegment = function (timecode, mediaSegment) {
      if (!_crypto) {
        _loadCrypto();
      }

      for (var i = 0, l = _mediaSegments.length; i < l; ++i) {
        if (_mediaSegments[i].timecode === timecode) {
          return _mediaSegments[i].checksum === _crypto.checksum(mediaSegment);
        }
      }

      return false;
    };

    var calculateChunkSize = function (fileLength) {
      var i;
      var targetLength = 40 * 1024;
      var chunkSize = fileLength / (targetLength / 20);

      for (i = 16 * 1024; i < 1024 * 1024; i *= 2) {
        if (chunkSize > i) {
          continue;
        }
        break;
      }
      _chunksize = i;
    };

    return {
      getId: getId,
      getCryptoId: getCryptoId,
      getChunkSize: getChunkSize,
      getTrackers: getTrackers,
      getInitSegment: getInitSegment,
      getMediaSegments: getMediaSegments,

      setCryptoId: setCryptoId,
      setChunkSize: setChunkSize,
      setTrackers: setTrackers,
      setInitSegment: setInitSegment,
      setMediaSegments: setMediaSegments,

      addMediaSegment: addMediaSegment,
      validateMediaSegment: validateMediaSegment,
      calculateChunkSize: calculateChunkSize
    };
  }

  module.exports = Metadata;
})();
