/*!
 * peeracle v0.0.1 (https://github.com/peeracle/peeracle)
 * Copyright 2015
 * Licensed under MIT
 */

'use strict';
var Peeracle = {};
Peeracle.Media = {};
Peeracle.Tracker = {};
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

    for (var i = 0, len = array.length; i < len; i++) {
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
  function File(handle) {
    var _handle = handle;
    var _offset = 0;
    var _length = (typeof handle === 'Blob') ? handle.size : -1;

    var getOffset = function () {
      return _offset;
    };

    var read = function (length) {
      _offset += length;
    };

    var seek = function (position) {
      _offset = position;
    };

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
      } else if (typeof _handle === 'string') {
        _nodeOpen(function () {
          _nodeFetchBytes(length, cb);
        });
      } else {
        _nodeFetchBytes(length, cb);
      }
    };

    return {
      getOffset: getOffset,
      fetchBytes: fetchBytes,
      read: read,
      seek: seek
    };
  }

  Peeracle.File = File;
})();

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
  function MetadataSerializer() {
    var _writeAsciiString = function (value, buffer) {
      for (var i = 0; i < value.length; ++i) {
        var c = value.charCodeAt(i);
        buffer.push(c);
      }
      buffer.push(0);
    };

    var _writeUInt32 = function (value, buffer) {
      var l = 0;
      var bytes = [];

      value = value >>> 0;
      while (l < 4) {
        bytes.push(value & 0xFF);
        value = value >> 8;
        ++l;
      }

      bytes = bytes.reverse();
      for (var i = 0; i < bytes.length; ++i) {
        buffer.push(bytes[i]);
      }
    };

    var _writeChar = function (value, buffer) {
      buffer.push(value & 0xFF);
    };

    var _serializeMediaSegments = function (metadata, buffer) {
      var mediaSegments = metadata.getMediaSegments();

      for (var i = 0, len = mediaSegments.length; i < len; ++i) {
        _writeUInt32(mediaSegments[i][0], buffer);
        _writeUInt32(mediaSegments[i][1], buffer);
        _writeUInt32(mediaSegments[i][2], buffer);
      }
    };

    var _serializeInitSegment = function (metadata, buffer) {
      var initSegment = metadata.getInitSegment();

      _writeUInt32(initSegment.length, buffer);
      for (var i = 0, len = initSegment.length; i < len; ++i) {
        buffer.push(initSegment[i]);
      }
    };

    var _serializeTrackers = function (metadata, buffer) {
      var trackers = metadata.getTrackers();

      for (var t = 0; t < trackers.length; ++t) {
        _writeAsciiString(trackers[t], buffer);
      }
      _writeChar(0, buffer);
    };

    var _serializeHeader = function (metadata, buffer) {
      var header = metadata.getHeader();

      _writeAsciiString(header.magic, buffer);
      _writeUInt32(header.version, buffer);
      _writeAsciiString(header.checksum, buffer);
    };

    var serialize = function (metadata) {
      var bytes = [];

      _serializeHeader(metadata, bytes);
      _serializeTrackers(metadata, bytes);
      _serializeInitSegment(metadata, bytes);
      _serializeMediaSegments(metadata, bytes);
      return bytes;
    };

    return {
      serialize: serialize
    };
  }

  Peeracle.MetadataSerializer = MetadataSerializer;
})();

(function () {
  function MetadataUnserializer() {
    var _peekChar = function (bytes) {
      return bytes[0];
    };

    var _readChar = function (bytes) {
      var value = bytes.splice(0, 1);
      return value[0];
    };

    var _readUInt32 = function (bytes) {
      var number = [];
      for (var i = 0; i < 4; ++i) {
        number.push(_readChar(bytes));
      }
      return (number[0] << 24) +
        (number[1] << 16) +
        (number[2] << 8) +
        number[3] >>> 0;
    };

    var _readString = function (bytes) {
      var c;
      var str = '';

      do {
        c = _readChar(bytes);
        if (!c) {
          break;
        }
        str += String.fromCharCode(c);
      } while (c);

      return str;
    };

    var _unserializeTrackers = function (bytes) {
      var trackers = [];
      var c;

      do {
        var str = '';
        c = _readChar(bytes);
        if (!c) {
          break;
        }
        str += String.fromCharCode(c) + _readString(bytes);
        trackers.push(str);
      } while (c);

      return trackers;
    };

    var _unserializeHeader = function (bytes) {
      var header = {};

      header.magic = _readString(bytes);
      header.version = _readUInt32(bytes);
      header.checksum = _readString(bytes);

      return header;
    };

    var _unserializeInitSegment = function (bytes) {
      var len = _readUInt32(bytes);
      return bytes.splice(0, len);
    };

    var _unserializeMediaSegments = function (bytes) {
      var segments = [];

      do {
        var segment = [];
        segment.push(_readUInt32(bytes));
        segment.push(_readUInt32(bytes));
        segment.push(_readUInt32(bytes));
        segments.push(segment);
      } while (bytes.length);

      return segments;
    };

    var unserialize = function (bytes) {
      var header = _unserializeHeader(bytes);
      var trackers = _unserializeTrackers(bytes);
      var init = _unserializeInitSegment(bytes);
      var media = _unserializeMediaSegments(bytes);

      return {
        header: header,
        trackers: trackers,
        init: init,
        media: media
      };
    };

    return {
      unserialize: unserialize
    };
  }

  Peeracle.MetadataUnserializer = MetadataUnserializer;
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
          successCb(sdp);
        }, errorFunction);
      }, errorFunction);
    };

    var createAnswer = function (offerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      _createPeerConnection();

      var realSdp = new RTCSessionDescription(offerSdp);
      _peerConnection.setRemoteDescription(realSdp, function () {
        _peerConnection.createAnswer(function (sdp) {
          _peerConnection.setLocalDescription(sdp, function () {
            successCb(sdp);
          }, errorFunction);
        }, errorFunction);
      }, errorFunction);
    };

    var setAnswer = function (answerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      var realSdp = new RTCSessionDescription(answerSdp);
      _peerConnection.setRemoteDescription(realSdp, function () {
        successCb();
      }, errorFunction);
    };

    var addIceCandidate = function (ice, successCb, failureCb) {
      _peerConnection.addIceCandidate(new RTCIceCandidate(ice),
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
  function Client() {
    var _url;
    var _ws;
    var _hashes = {};
    var _subscribers = [];

    var _onOpen = function () {
      console.log('Peeracle.Tracker: onOpen');

      _ws.send(JSON.stringify({type: 'hello'}));
    };

    var _onMessage = function (event) {
      console.log('Peeracle.Tracker: _onMessage', event.data);

      var welcome = function (msg) {
        if (!msg.id) {
          return;
        }

        _subscribers.forEach(function (subscriber) {
          subscriber.onConnect(msg.id);
        });
      };

      var enter = function (msg) {
        if (!msg.hash || !msg.peers || !_hashes[msg.hash]) {
          return;
        }

        msg.peers.forEach(function (peer) {
          _hashes[msg.hash].onEnter(peer);
        });
      };

      var leave = function (msg) {
        if (!msg.hash || !msg.id || !_hashes[msg.hash]) {
          return;
        }

        _hashes[msg.hash].onLeave(msg.id);
      };

      var sdp = function (msg) {
        if (!msg.hash || !msg.from || !msg.data || !_hashes[msg.hash]) {
          return;
        }

        _hashes[msg.hash].onSdp(msg.from, msg.data);
      };

      var _messageHandlers = {
        welcome: welcome,
        enter: enter,
        leave: leave,
        sdp: sdp
      };

      var jmessage;

      try {
        jmessage = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (_messageHandlers[jmessage.type]) {
        _messageHandlers[jmessage.type](jmessage);
      }
    };

    var _onError = function () {
      console.log('Peeracle.Tracker: _onError');
    };

    var _onClose = function () {
      console.log('Peeracle.Tracker: _onClose');
    };

    var connect = function (url) {
      _url = url;
      _ws = new WebSocket(_url, 'prcl', _url);
      _ws.onopen = _onOpen;
      _ws.onmessage = _onMessage;
      _ws.onerror = _onError;
      _ws.onclose = _onClose;
    };

    var disconnect = function () {
      _subscribers.forEach(function (subscriber, index) {
        subscriber.onDisconnect();
        _subscribers.splice(index, 1);
      });

      _ws.close();
    };

    var announce = function (hash, got, subscriber) {
      if (!_hashes[hash]) {
        _hashes[hash] = subscriber;
      }

      _ws.send(JSON.stringify({type: 'announce', hash: hash, got: got}));
    };

    var remove = function (hash) {
      if (_hashes[hash]) {
        delete _hashes[hash];
      }
    };

    var sendSdp = function (hash, peer, sdp) {
      if (!_hashes[hash]) {
        return;
      }

      _ws.send(JSON.stringify({type: 'sdp', hash: hash, peer: peer, data: sdp}));
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
      disconnect: disconnect,
      announce: announce,
      remove: remove,
      sendSdp: sendSdp,
      subscribe: subscribe,
      unsubscribe: unsubscribe
    };
  }

  var Tracker = {
    Client: Client
  };

  Peeracle.Tracker.Client = Tracker.Client;
})();
