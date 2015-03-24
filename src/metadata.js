'use strict';

(function () {
  var Checksum;
  var Utils;

  if (typeof module === 'undefined') {
    Checksum = Peeracle.Checksum;
    Utils = Peeracle.Utils;
  } else {
    Checksum = require('./checksum');
    Utils = require('./utils');
  }

  function Metadata() {
    var _checksum;
    var _checksumId = 'crc32';
    var _chunksize = 0;
    var _trackers = [];
    var _initSegment = [];
    var _mediaSegments = {};

    var getChecksum = function () {
      return _checksumId;
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

    var setChecksum = function (checksum) {
      _checksumId = checksum;
    };

    var setTrackers = function (trackers) {
      _trackers = trackers;
    };

    var setInitSegment = function (initSegment) {
      _initSegment = initSegment;
    };

    var _loadChecksum = function () {
      for (var c in Checksum) {
        if (Checksum[c].getIdentifier() === _checksumId) {
          _checksum = Checksum[c].create();
          break;
        }
      }

      if (!_checksum) {
        throw 'Unknown checksum ' + _checksumId;
      }
    };

    var addMediaSegment = function (timecode, mediaSegment, progressCallback) {
      var clusterLength = mediaSegment.length;
      var chunkLength = _chunksize;

      if (!_checksum) {
        _loadChecksum();
      }

      _mediaSegments[timecode] = [clusterLength, _checksum.checksum(mediaSegment), []];

      for (var i = 0; i < clusterLength; i += chunkLength) {
        var chunk = mediaSegment.subarray(i, i + chunkLength);

        _mediaSegments[timecode][2].push(_checksum.checksum(chunk));

        if (progressCallback) {
          progressCallback(chunk);
        }

        if (clusterLength - i < chunkLength) {
          chunkLength = clusterLength - i;
        }
      }

      if (progressCallback) {
        progressCallback(null);
      }
    };

    var validateMediaSegment = function (timecode, mediaSegment) {
      if (!_checksum) {
        _loadChecksum();
      }

      return _mediaSegments[timecode][1] === _checksum.checksum(mediaSegment);
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
      getChecksum: getChecksum,
      getChunkSize: getChunkSize,
      getTrackers: getTrackers,
      getInitSegment: getInitSegment,
      getMediaSegments: getMediaSegments,

      setChecksum: setChecksum,
      setTrackers: setTrackers,
      setInitSegment: setInitSegment,
      addMediaSegment: addMediaSegment,

      validateMediaSegment: validateMediaSegment,
      calculateChunkSize: calculateChunkSize
    };
  }

  module.exports = Metadata;
})();
