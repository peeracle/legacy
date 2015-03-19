/*!
 * peeracle v0.0.1 (https://github.com/peeracle/peeracle)
 * Copyright 2015
 * Licensed under MIT
 */

'use strict';
var Peeracle = {};
Peeracle.Media = {};
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

  Peeracle.Utils = Utils;
})();

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

  Peeracle.File = File;
})();

(function () {
})();

(function () {
  var getFileHeader = function () {
    return [0x1A, 0x45, 0xDF, 0xA3];
  };

  var _object = function (file) {
    var _file = file;
    var _cluster = null;

    var _readVariableInt = function (buffer, start, maxSize) {
      var length = 0;
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
      var headerOffset = _file.getCurrentOffset();

      _file.fetchBytes(12, function (bytes) {
        if (!bytes) {
          doneCallback(null);
          return;
        }

        var start = _file.getIndex();
        var tag = _readBufferedTag(start, bytes);

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

  Peeracle.Media.WebM = Media.WebM;
})();

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

  Peeracle.Metadata = Metadata;
})();

(function () {
  function MediaChannel(peerConnection) {
    var _dataChannel;
    var _peerConnection = peerConnection;

    var _onError = function (error) {
      console.log('Peeracle.MediaChannel onerror', error);
    };

    var _onMessage = function (event) {
      console.log('Peeracle.MediaChannel onmessage', event.data);
    };

    var _onOpen = function () {
      console.log('Peeracle.MediaChannel onopen');
    };

    var _onClose = function () {
      console.log('Peeracle.MediaChannel onclose');
    };

    var setDataChannel = function (dataChannel) {
      _dataChannel = dataChannel;
      _dataChannel.onerror = _onError;
      _dataChannel.onmessage = _onMessage;
      _dataChannel.onopen = _onOpen;
      _dataChannel.onclose = _onClose;
    };

    var createDataChannel = function () {
      _dataChannel = _peerConnection.createDataChannel('media');
      setDataChannel(_dataChannel);
    };

    var getReadyState = function () {
      return _dataChannel.readyState;
    };

    return {
      createDataChannel: createDataChannel,
      setDataChannel: setDataChannel,
      getReadyState: getReadyState
    };
  }

  Peeracle.MediaChannel = MediaChannel;
})();

(function () {
  function SignalChannel(peerConnection) {
    var _dataChannel;
    var _peerConnection = peerConnection;

    var _onError = function (error) {
      console.log('Peeracle.SignalChannel onerror', error);
    };

    var _onMessage = function (event) {
      console.log('Peeracle.SignalChannel onmessage', event.data);
    };

    var _onOpen = function () {
      console.log('Peeracle.SignalChannel onopen');
    };

    var _onClose = function () {
      console.log('Peeracle.SignalChannel onclose');
    };

    var setDataChannel = function (dataChannel) {
      _dataChannel = dataChannel;
      _dataChannel.onerror = _onError;
      _dataChannel.onmessage = _onMessage;
      _dataChannel.onopen = _onOpen;
      _dataChannel.onclose = _onClose;
    };

    var createDataChannel = function () {
      _dataChannel = _peerConnection.createDataChannel('signal');
      setDataChannel(_dataChannel);
    };

    var getReadyState = function () {
      return _dataChannel.readyState;
    };

    return {
      createDataChannel: createDataChannel,
      setDataChannel: setDataChannel,
      getReadyState: getReadyState
    };
  }

  Peeracle.SignalChannel = SignalChannel;
})();

(function () {
  var RTCIceCandidate;
  var RTCPeerConnection;
  var RTCSessionDescription;

  var MediaChannel;
  var SignalChannel;

  if (typeof module === 'undefined') {
    MediaChannel = Peeracle.MediaChannel;
    SignalChannel = Peeracle.SignalChannel;
  } else {
    MediaChannel = require('./mediachannel');
    SignalChannel = require('./signalchannel');
  }

  if (typeof module === 'undefined') {
    RTCIceCandidate = window.mozRTCIceCandidate ||
    window.webkitRTCIceCandidate ||
    window.RTCIceCandidate;

    RTCPeerConnection = window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.RTCPeerConnection;

    RTCSessionDescription = window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.RTCSessionDescription;
  } else {
    var wrtc = require('wrtc');
    RTCPeerConnection = wrtc.RTCPeerConnection;
    RTCSessionDescription = wrtc.RTCSessionDescription;
    RTCIceCandidate = wrtc.RTCIceCandidate;
  }

  function Peer() {
    var _subscribers = [];
    var _peerConnection;
    var _signalChannel;
    var _mediaChannel;

    var _onIceCandidate = function (event) {
      if (!_peerConnection || !event) {
        return;
      }

      var ice = event.candidate;
      if (ice) {
        ice = JSON.stringify(ice);
      }

      _subscribers.forEach(function(subscriber) {
        subscriber.onIceCandidate(ice);
      });
    };

    var _onIceConnectionStateChange = function (event) {
      if (!_peerConnection || !event) {
        return;
      }

      _subscribers.forEach(function(subscriber) {
        subscriber.onConnectionStateChange(_peerConnection.iceConnectionState);
      });
    };

    var _onIceGatheringStateChange = function () {
    };

    var _onReadyStateChange = function () {
      console.log('_onReadyStateChange');
    };

    var _onDataChannel = function (event) {
      if (!event || !event.channel) {
        return;
      }

      if (event.channel.label === 'signal') {
        _signalChannel.setDataChannel(event.channel);
      } else if (event.channel.label === 'media') {
        _mediaChannel.setDataChannel(event.channel);
      }
    };

    var _createPeerConnection = function () {
      var configuration = {
        iceServers: [
          {
            url: 'stun:stun.l.google.com:19302'
          }
        ]
      };

      _peerConnection = new RTCPeerConnection(configuration);
      _peerConnection.onicecandidate = _onIceCandidate;
      _peerConnection.oniceconnectionstatechange = _onIceConnectionStateChange;
      _peerConnection.onicegatheringstatechange = _onIceGatheringStateChange;
      _peerConnection.ondatachannel = _onDataChannel;
      _peerConnection.onreadystatechange = _onReadyStateChange;

      _signalChannel = new SignalChannel(_peerConnection);
      _mediaChannel = new MediaChannel(_peerConnection);
    };

    var subscribe = function (subscriber) {
      var index = _subscribers.indexOf(subscriber);

      if (!~index) {
        _subscribers.push(subscriber);
      }
    };

    var unsubscribe = function (subscriber) {
      var index = _subscribers.indexOf(subscriber);

      if (~index) {
        _subscribers.splice(index, 1);
      }
    };

    var createOffer = function (successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      _createPeerConnection();

      _mediaChannel.createDataChannel();
      _signalChannel.createDataChannel();
      _peerConnection.createOffer(function (sdp) {
        _peerConnection.setLocalDescription(sdp, function () {
          successCb(JSON.stringify(sdp));
        }, errorFunction);
      }, errorFunction);
    };

    var createAnswer = function (offerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      _createPeerConnection();

      var realSdp = new RTCSessionDescription(JSON.parse(offerSdp));
      _peerConnection.setRemoteDescription(realSdp, function () {
        _peerConnection.createAnswer(function (sdp) {
          _peerConnection.setLocalDescription(sdp, function () {
            successCb(JSON.stringify(sdp));
          }, errorFunction);
        }, errorFunction);
      }, errorFunction);
    };

    var setAnswer = function (answerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      var realSdp = new RTCSessionDescription(JSON.parse(answerSdp));
      _peerConnection.setRemoteDescription(realSdp, function () {
        successCb();
      }, errorFunction);
    };

    var addIceCandidate = function (ice, successCb, failureCb) {
      _peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(ice)),
        function () {
          successCb();
        }, function (error) {
          failureCb(error);
        }
      );
    };

    var close = function () {
      _peerConnection.close();
    };

    return {
      subscribe: subscribe,
      unsubscribe: unsubscribe,
      createOffer: createOffer,
      createAnswer: createAnswer,
      setAnswer: setAnswer,
      addIceCandidate: addIceCandidate,
      close: close
    };
  }

  Peeracle.Peer = Peer;
})();

(function () {
  function Tracker(url) {
    var _url = url;
    var _ws;
    var _hashes = {};
    var _subscribers = [];

    var _onOpen = function () {
      console.log('Peeracle.Tracker: onOpen');

      _ws.send('');
      _subscribers.forEach(function(subscriber) {
        subscriber.onConnect();
      });
    };

    var _onMessage = function () {
      console.log('Peeracle.Tracker: _onMessage');
    };

    var _onError = function () {
      console.log('Peeracle.Tracker: _onError');
    };

    var _onClose = function () {
      console.log('Peeracle.Tracker: _onClose');
    };

    var connect = function () {
      _ws = new WebSocket(_url);
      _ws.onopen = _onOpen;
      _ws.onmessage = _onMessage;
      _ws.onerror = _onError;
      _ws.onclose = _onClose;
    };

    var announce = function (hash, got, subscriber) {
      if (!(_hashes[hash] in undefined)) {
        _hashes[hash] = subscriber;
      }
    };

    var remove = function (hash) {
      if (_hashes[hash] in undefined) {
        delete _hashes[hash];
      }
    };

    var subscribe = function (subscriber) {
      var index = _subscribers.indexOf(subscriber);

      if (!~index) {
        _subscribers.push(subscriber);
      }
    };

    var unsubscribe = function (subscriber) {
      var index = _subscribers.indexOf(subscriber);

      if (~index) {
        _subscribers.splice(index, 1);
      }
    };

    return {
      connect: connect,
      announce: announce,
      remove: remove,
      subscribe: subscribe,
      unsubscribe: unsubscribe
    };
  }

  Peeracle.Tracker = Tracker;
})();
