'use strict';

(function () {
  var Media;
  var Utils;

  if (typeof module === 'undefined') {
    Media = Peeracle.Media;
    Utils = Peeracle.Utils;
  } else {
    Media = require('./media');
    Utils = require('./utils');
  }

  function Metadata() {
    var _getMediaFormat = function (file, doneCallback) {
      file.fetchBytes(4, function (bytes) {
        if (!bytes || bytes.length !== 4) {
          doneCallback(null);
          return;
        }

        var mediaFormat = null;

        file.seek(0);
        for (var fileFormat in Media) {
          var header = Media[fileFormat].getFileHeader();
          if (header[0] === bytes[0] &&
            header[1] === bytes[1] &&
            header[2] === bytes[2] &&
            header[3] === bytes[3]) {
            mediaFormat = Media[fileFormat].create(file);
            break;
          }
        }

        if (!mediaFormat) {
          doneCallback(null);
          return;
        }

        doneCallback(mediaFormat);
      });
    };

    var _calculateChunkSize = function (fileLength) {
      var i;
      var targetLength = 40 * 1024;
      var chunkSize = fileLength / (targetLength / 20);

      for (i = 16 * 1024; i < 1024 * 1024; i *= 2) {
        if (chunkSize > i) {
          continue;
        }
        break;
      }
      return i;
    };

    var create = function (file, doneCallback, progressCallback) {
      _getMediaFormat(file, function (mediaFormat) {
        if (!mediaFormat) {
          doneCallback(null);
          return;
        }

        var metadata = {
          hash: null,
          tracker: 'ws://tracker.dotstar.fr:8080',
          init: null,
          chunksize: _calculateChunkSize(file.getFileLength()),
          clusters: []
        };

        mediaFormat.getInitSegment(function (bytes) {
          // var warray = CryptoJS.lib.WordArray.create(bytes);
          // var worker = new Worker('static/peeracle.metadata.worker.js');

          metadata.init = bytes;
          metadata.hash = Utils.Crc32(bytes);
          // metadata.hash = CryptoJS.SHA3(warray) + '';

          mediaFormat.getNextMediaSegment(function addCluster(segment) {
            if (!segment) {
              console.log(metadata.hash);
              doneCallback(metadata);
              return;
            }

            var cluster = {
              timecode: segment.timecode,
              size: segment.bytes.length,
              chunks: []
            };

            var clusterLength = segment.bytes.length;
            var chunkLength = metadata.chunksize;

            /*var i = 0;
             worker.onmessage = function (event) {
             cluster.chunks.push(event.data);

             if (clusterLength - i < chunkLength)
             chunkLength = clusterLength - i;

             i += chunkLength;

             if (progressCallback) {
             progressCallback(chunkLength);
             }

             if (i < clusterLength) {
             var chunk = segment.bytes.subarray(i, i + chunkLength);
             worker.postMessage(chunk);
             } else {
             metadata.clusters.push(cluster);
             media.getNextMediaSegment(addCluster);
             }
             };

             var chunk = segment.bytes.subarray(i, i + chunkLength);
             worker.postMessage(chunk);*/

            for (var i = 0; i < clusterLength; i += chunkLength) {
              var chunk = segment.bytes.subarray(i, i + chunkLength);

              cluster.chunks.push(Utils.Crc32(chunk));

              if (progressCallback) {
                progressCallback(chunk.length);
              }

              if (clusterLength - i < chunkLength) {
                chunkLength = clusterLength - i;
              }
            }

            metadata.clusters.push(cluster);
            mediaFormat.getNextMediaSegment(addCluster);
            //});
          });
        });
      });
    };

    var load = function (file) {

    };

    return {
      create: create,
      load: load
    };
  }

  module.exports = Metadata;
})();
