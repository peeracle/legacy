'use strict';

(function () {
  var Utils;

  if (typeof module === 'undefined') {
    Utils = Peeracle.Utils;
  } else {
    Utils = require('./utils');
  }

  function Metadata() {
    var _checksum = 'crc32';
    var _chunksize = 0;
    var _trackers = [];
    var _initSegment = [];
    var _mediaSegments = {};

    var getChecksum = function () {
      return _checksum;
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

    var setChecksum = function (header) {
      _checksum = header;
    };

    var setTrackers = function (trackers) {
      _trackers = trackers;
    };

    var setInitSegment = function (initSegment) {
      _initSegment = initSegment;
    };

    var addMediaSegment = function (timecode, mediaSegment, progressCallback) {
      var clusterLength = mediaSegment.length;
      var chunkLength = _chunksize;

      _mediaSegments[timecode] = [clusterLength, Utils.Crc32(mediaSegment), []];

      for (var i = 0; i < clusterLength; i += chunkLength) {
        var chunk = mediaSegment.subarray(i, i + chunkLength);

        _mediaSegments[timecode][2].push(Utils.Crc32(chunk));

        if (progressCallback) {
          progressCallback(chunk.length);
        }

        if (clusterLength - i < chunkLength) {
          chunkLength = clusterLength - i;
        }
      }
    };

    var validateMediaSegment = function (timecode, mediaSegment) {
      return _mediaSegments[timecode][1] === Utils.Crc32(mediaSegment);
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
