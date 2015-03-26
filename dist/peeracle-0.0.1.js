/*!
 * peeracle v0.0.1 (https://github.com/peeracle/peeracle)
 * Copyright 2015
 * Licensed under MIT
 */

'use strict';
var Peeracle = {};
Peeracle.Checksum = {};
Peeracle.Media = {};
Peeracle.Tracker = {};
(function () {
  var getIdentifier = function () {
    return 'crc32';
  };

  var _object = function () {
    var _crc;
    var _crc32Table = null;

    var _generateCrc32Table = function () {
      var c;
      _crc32Table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        _crc32Table[n] = c;
      }
    };

    var init = function () {
      if (!_crc32Table) {
        _generateCrc32Table();
      }

      _crc = 0 ^ (-1);
    };

    var update = function (array) {
      for (var i = 0, len = array.length; i < len; i++) {
        _crc = (_crc >>> 8) ^ _crc32Table[(_crc ^ array[i]) & 0xFF];
      }
    };

    var final = function () {
      return (_crc ^ (-1)) >>> 0;
    };

    var checksum = function (array) {
      init();
      update(array);
      return final();
    };

    var serialize = function (value, buffer) {
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

    var unserialize = function (bytes) {
      var number = [];
      for (var i = 0; i < 4; ++i) {
        var char = bytes.splice(0, 1);
        number.push(char[0]);
      }
      return (number[0] << 24) +
        (number[1] << 16) +
        (number[2] << 8) +
        number[3] >>> 0;
    };

    return {
      checksum: checksum,
      init: init,
      update: update,
      final: final,
      serialize: serialize,
      unserialize: unserialize
    };
  };

  var create = function () {
    return new _object();
  };

  var Checksum = {
    Crc32: {
      getIdentifier: getIdentifier,
      create: create
    }
  };
  Peeracle.Checksum.Crc32 = Checksum.Crc32;
})();

(function () {
  var Utils = {
  };

  Peeracle.Utils = Utils;
})();

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

  Peeracle.File = File;
})();

(function () {
  var getFileHeader = function () {
    return [0x1A, 0x45, 0xDF, 0xA3];
  };

  var _object = function (file) {
    var _file = file;
    var _cluster = null;
    var _clusters = {};

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

          var timecode = _getClusterTimecode(bytes);
          _clusters[timecode] = tag;
          doneCallback({
            timecode: timecode,
            bytes: bytes
          });
        });
      });
    };

    var getMediaSegmentAt = function (timecode, doneCallback) {
      if (!(timecode in _clusters)) {
        doneCallback(null);
        return;
      }

      var tag = _clusters[timecode];
      _readTagBytes(tag, function (bytes) {
        doneCallback({
          timecode: timecode,
          bytes: bytes
        });
      });
    };

    return {
      getInitSegment: getInitSegment,
      getNextMediaSegment: getNextMediaSegment,
      getMediaSegmentAt: getMediaSegmentAt
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
  var Checksum;

  if (typeof module === 'undefined') {
    Checksum = Peeracle.Checksum;
  } else {
    Checksum = require('./checksum');
  }

  function Metadata() {
    var _id;
    var _checksum;
    var _checksumId = 'crc32';
    var _chunksize = 0;
    var _trackers = [];
    var _initSegment = [];
    var _mediaSegments = {};

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

    var getId = function () {
      if (!_id) {
        if (!_checksum) {
          _loadChecksum();
        }

        _checksum.init();
        _checksum.update(_initSegment);
        for (var m in _mediaSegments) {
          _checksum.update([_mediaSegments[m][1]]);
          for (var c = 0, l = _mediaSegments[m][2].length; c < l; ++c) {
            _checksum.update([_mediaSegments[m][2][c]]);
          }
        }
        _id = _checksum.final();
      }
      return _id;
    };

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

      var i = 0;
      var arr = [];
      for (var t in mediaSegment) {
        arr[i++] = mediaSegment[t];
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
      getId: getId,
      getChecksum: getChecksum,
      getChunkSize: getChunkSize,
      getTrackers: getTrackers,
      getInitSegment: getInitSegment,
      getMediaSegments: getMediaSegments,

      setChecksum: setChecksum,
      setChunkSize: setChunkSize,
      setTrackers: setTrackers,
      setInitSegment: setInitSegment,
      setMediaSegments: setMediaSegments,

      addMediaSegment: addMediaSegment,
      validateMediaSegment: validateMediaSegment,
      calculateChunkSize: calculateChunkSize
    };
  }

  Peeracle.Metadata = Metadata;
})();

(function () {
  var Checksum;

  if (typeof module === 'undefined') {
    Checksum = Peeracle.Checksum;
  } else {
    Checksum = require('./checksum');
  }

  function MetadataSerializer() {
    var _checksum;

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

    var _writeChecksum = function (value, buffer) {
      _checksum.serialize(value, buffer);
    };

    var _serializeHeader = function (metadata, buffer) {
      var checksum = metadata.getChecksum();
      var chunksize = metadata.getChunkSize();

      for (var c in Checksum) {
        if (Checksum[c].getIdentifier() === checksum) {
          _checksum = Checksum[c].create();
          break;
        }
      }

      if (!_checksum) {
        throw 'Unknown checksum ' + checksum;
      }

      _writeAsciiString('PRCL', buffer);
      _writeUInt32(1, buffer);
      _writeAsciiString(checksum, buffer);
      _writeUInt32(chunksize, buffer);
    };

    var _serializeTrackers = function (metadata, buffer) {
      var trackers = metadata.getTrackers();

      for (var t = 0; t < trackers.length; ++t) {
        _writeAsciiString(trackers[t], buffer);
      }
      _writeChar(0, buffer);
    };

    var _serializeInitSegment = function (metadata, buffer) {
      var initSegment = metadata.getInitSegment();

      _writeUInt32(initSegment.length, buffer);
      for (var i = 0, len = initSegment.length; i < len; ++i) {
        buffer.push(initSegment[i]);
      }
    };

    var _serializeMediaSegments = function (metadata, buffer) {
      var mediaSegments = metadata.getMediaSegments();

      for (var m in mediaSegments) {
        _writeUInt32(m, buffer);
        _writeUInt32(mediaSegments[m][0], buffer);
        _writeChecksum(mediaSegments[m][1], buffer);
        _writeUInt32(mediaSegments[m][2].length, buffer);
        for (var i = 0, l = mediaSegments[m][2].length; i < l; ++i) {
          _writeChecksum(mediaSegments[m][2][i], buffer);
        }
      }
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
  var Checksum;

  if (typeof module === 'undefined') {
    Checksum = Peeracle.Checksum;
  } else {
    Checksum = require('./checksum');
  }

  function MetadataUnserializer() {
    var _checksum;

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

    var _readChecksum = function (bytes) {
      var result = _checksum.unserialize(bytes);
      return result;
    };

    var _unserializeInitSegment = function (bytes) {
      var len = _readUInt32(bytes);
      return bytes.splice(0, len);
    };

    var _unserializeHeader = function (bytes) {
      var header = {};

      header.magic = _readString(bytes);
      header.version = _readUInt32(bytes);
      header.checksum = _readString(bytes);
      header.chunksize = _readUInt32(bytes);

      for (var c in Checksum) {
        if (Checksum[c].getIdentifier() === header.checksum) {
          _checksum = Checksum[c].create();
          break;
        }
      }

      if (!_checksum) {
        throw 'Unknown checksum ' + header.checksum;
      }

      return header;
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

    var _unserializeMediaSegments = function (bytes) {
      var segments = {};

      do {
        var timecode = _readUInt32(bytes);
        var segment = [];
        var chunks = [];
        var num;

        segment.push(_readUInt32(bytes));
        segment.push(_readChecksum(bytes));

        num = _readUInt32(bytes);
        for (var i = 0; i < num; ++i) {
          chunks.push(_readChecksum(bytes));
        }
        segment.push(chunks);
        segments[timecode] = segment;
      } while (bytes.length);

      return segments;
    };

    var unserialize = function (bytes, metadata) {
      var header = _unserializeHeader(bytes);
      var trackers = _unserializeTrackers(bytes);
      var init = _unserializeInitSegment(bytes);
      var media = _unserializeMediaSegments(bytes);

      metadata.setChecksum(header.checksum);
      metadata.setChunkSize(header.chunksize);
      metadata.setTrackers(trackers);
      metadata.setInitSegment(init);
      metadata.setMediaSegments(media);
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
