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
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
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

(function() {
  window['Peeracle'] = {};
  var Peeracle = window.Peeracle;

  var RTCPeerConnection = window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.RTCPeerConnection;

  var RTCSessionDescription = window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.RTCSessionDescription;

  var RTCIceCandidate = window.mozRTCIceCandidate ||
    window.webkitRTCIceCandidate ||
    window.RTCIceCandidate;

  /**
   * @class
   * @memberof Peeracle
   * @param {!Uint8Array} buffer
   * @constructor
   */

  function BinaryStream(buffer) {
    /**
     * @member {Uint8Array}
     */
    this.bytes = buffer;

    /**
     * @member {number}
     * @private
     */
    this.length_ = buffer.length;

    /**
     * @member {number}
     * @private
     */
    this.offset_ = 0;
  }

  BinaryStream.ERR_INVALID_ARGUMENT = 'Invalid argument';
  BinaryStream.ERR_INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
  BinaryStream.ERR_VALUE_OUT_OF_BOUNDS = 'Value out of bounds';

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readByte = function readByte() {
    if (this.offset_ + 1 >= this.length_) {
      throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    }
    return this.bytes[this.offset_++];
  };

  /**
   * @param value
   */
  BinaryStream.prototype.writeByte = function writeByte(value) {
    if (typeof value !== 'number') {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }
    if (value < 0 || value > 255) {
      throw new Error(BinaryStream.ERR_VALUE_OUT_OF_BOUNDS);
    }
    this.bytes.set(new Uint8Array([value]), this.offset_++);
  };

  /**
   * @param length
   * @returns {Uint8Array}
   */
  BinaryStream.prototype.readBytes = function readBytes(length) {
    var bytes;

    if (typeof length !== 'number' || length < 1) {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    if (length >= this.length_ ||
      this.offset_ + length >= this.length_) {
      throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    }

    bytes = this.bytes.subarray(this.offset_, this.offset_ + length);
    this.offset_ += length;
    return bytes;
  };

  /**
   * @param {Uint8Array} bytes
   */
  BinaryStream.prototype.writeBytes = function writeBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    this.bytes.set(bytes, this.offset_);
    this.offset_ += bytes.length;
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readFloat4 = function readFloat8() {
    var number = this.readBytes(4);
    var f = new Float32Array(number.buffer);
    return f[0];
  };

  /**
   * @param {number} value
   */
  BinaryStream.prototype.writeFloat4 = function writeFloat8(value) {
    var f;
    var u;

    if (typeof value !== 'number') {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    console.log(value);
    f = new Float32Array([value]);
    u = new Uint8Array(f.buffer);
    this.writeBytes(u);
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readFloat8 = function readFloat8() {
    var number = this.readBytes(8);
    var f = new Float64Array(number.buffer);
    return f[0];
  };

  /**
   * @param {number} value
   */
  BinaryStream.prototype.writeFloat8 = function writeFloat8(value) {
    var f;
    var u;

    if (typeof value !== 'number') {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    f = new Float64Array([value]);
    u = new Uint8Array(f.buffer);

    this.writeBytes(u);
  };

  /**
   * @param {boolean?} unsigned
   * @returns {number}
   */
  BinaryStream.prototype.readInt32 = function readInt32(unsigned) {
    var number = this.readBytes(4);
    var value = (number[0] << 24) +
      (number[1] << 16) +
      (number[2] << 8);

    if (unsigned) {
      return value + number[3] >>> 0;
    }

    return value + number[3];
  };

  /**
   * @param {number} value
   * @param {boolean?} unsigned
   */
  BinaryStream.prototype.writeInt32 = function writeInt32(value, unsigned) {
    var l = 0;
    var bytes;
    var val = value;

    if (typeof val !== 'number') {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    if (unsigned) {
      val = val >>> 0;
    } else if (val < -0x7FFFFFFF || val > 0x7FFFFFFF) {
      throw new Error(BinaryStream.ERR_VALUE_OUT_OF_BOUNDS);
    }

    bytes = [];
    while (l < 4) {
      bytes[l] = (val & 0xFF);
      val = val >> 8;
      ++l;
    }

    this.writeBytes(new Uint8Array(bytes.reverse()));
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readUInt32 = function readUInt32() {
    return this.readInt32(true);
  };

  /**
   * @param {number} value
   */
  BinaryStream.prototype.writeUInt32 = function writeUInt32(value) {
    if (typeof value !== 'number') {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }
    if (value < 0 || value > 0xFFFFFFFF) {
      throw new Error(BinaryStream.ERR_VALUE_OUT_OF_BOUNDS);
    }
    this.writeInt32(value, true);
  };

  /**
   * @param length
   * @returns {string}
   */
  BinaryStream.prototype.readString = function readString(length) {
    var str = '';
    var bytes;
    var i;

    if (typeof length === 'number') {
      bytes = this.readBytes(length);
      for (i = 0; i < length; ++i) {
        str += String.fromCharCode(bytes[i]);
      }
      return str;
    }

    i = this.readByte();
    while (i) {
      str += String.fromCharCode(i);
      i = this.readByte();
    }
    return str;
  };

  /**
   * @param {string} value
   */
  BinaryStream.prototype.writeString = function writeString(value) {
    var i;
    var length;
    var bytes;

    if (typeof value !== 'string') {
      this.writeByte(0);
      return;
    }

    length = value.length;
    bytes = new Uint8Array(length + 1);

    for (i = 0; i < length; ++i) {
      bytes[i] = value.charCodeAt(i);
    }
    bytes[length] = 0;

    this.writeBytes(bytes);
  };

  /**
   *
   * @param value
   */
  BinaryStream.prototype.seek = function seek(value) {
    if (typeof value !== 'number') {
      throw new Error(BinaryStream.ERR_INVALID_ARGUMENT);
    }
    if (value < 0 || value >= this.length_) {
      throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    }
    this.offset_ = value;
  };

  Peeracle.BinaryStream = BinaryStream;

  /**
   * @interface
   * @memberof Peeracle
   * @namespace
   */
  function Crypto() {}

  /**
   *
   * @param id
   * @returns {?Crypto}
   */
  Crypto.createInstance = function createInstance(id) {
    var c;

    for (c in Crypto) {
      if (Crypto.hasOwnProperty(c) &&
        Crypto[c].hasOwnProperty('IDENTIFIER') &&
        Crypto[c].IDENTIFIER === id) {
        return new Crypto[c]();
      }
    }

    return null;
  };

  /* eslint-disable */

  /**
   * @function
   * @param array
   */
  Crypto.prototype.checksum = function checksum(array) {};

  /**
   * @function
   */
  Crypto.prototype.init = function init() {};

  /**
   * @function
   * @param array
   */
  Crypto.prototype.update = function update(array) {};

  /**
   * @function
   */
  Crypto.prototype.finish = function finish() {};

  /**
   *
   * @param value
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.serialize = function serialize(value, binaryStream) {};

  /**
   *
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.unserialize = function unserialize(binaryStream) {};

  /* eslint-enable */

  Peeracle.Crypto = Crypto;

  /**
   * crc32 checksum algorithm implementation
   *
   * @class
   * @constructor
   * @memberof Peeracle.Crypto
   * @implements {Peeracle.Crypto}
   */
  function Crc32() {
    /**
     * @type {number}
     * @private
     */
    this.crc_ = null;

    /**
     * @type {Array.<number>}
     * @private
     */
    this.crcTable_ = null;
  }

  Crc32.prototype = Object.create(Crypto.prototype);
  Crc32.prototype.constructor = Crc32;

  /** @type {string} */
  Crc32.IDENTIFIER = 'crc32';

  /**
   * Generate the crc32 table.
   *
   * @function
   * @private
   */
  Crc32.prototype.generateCrc32Table_ = function generateCrc32Table_() {
    var c;
    var n;
    var k;

    this.crcTable_ = [];
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      this.crcTable_[n] = c;
    }
  };

  /**
   * Retrieve the checksum of an entire array.
   *
   * @function
   * @param array
   * @returns {*}
   */
  Crc32.prototype.checksum = function checksum(array) {
    this.init();
    this.update(array);
    return this.finish();
  };

  /**
   * Initialize the checksum algorithm.
   *
   * @function
   */
  Crc32.prototype.init = function init() {
    if (!this.crcTable_) {
      this.generateCrc32Table_();
    }

    this.crc_ = 0 ^ (-1);
  };

  /**
   * Do a checksum for a partial array.
   *
   * @function
   * @param array
   */
  Crc32.prototype.update = function update(array) {
    var i;
    var l;
    var keys = Object.keys(array);

    for (i = 0, l = keys.length; i < l; ++i) {
      this.crc_ = (this.crc_ >>> 8) ^
        this.crcTable_[(this.crc_ ^ array[i]) & 0xFF];
    }
  };

  /**
   * Return the final checksum.
   *
   * @function
   * @returns {number}
   */
  Crc32.prototype.finish = function finish() {
    return (this.crc_ ^ (-1)) >>> 0;
  };

  /**
   * Convert the checksum to bytes.
   *
   * @function
   * @param value
   * @param {BinaryStream} binaryStream
   */
  Crc32.prototype.serialize = function serialize(value, binaryStream) {
    return binaryStream.writeUInt32(value);
  };

  /**
   * Read the checksum from bytes.
   *
   * @function
   * {BinaryStream} binaryStream
   * @returns {*}
   */
  Crc32.prototype.unserialize = function unserialize(binaryStream) {
    return binaryStream.readUInt32();
  };

  Peeracle.Crypto.Crc32 = Crc32;

  /* eslint-disable */

  /**
   * @interface
   * @memberof Peeracle
   * @param {*} handle
   * @constructor
   */
  function DataSource(handle) {
    /**
     * @readonly
     * @member {number}
     */
    this.offset = 0;

    /**
     * @readonly
     * @member {number}
     */
    this.length = 0;
  }

  /**
   * @function
   * @param length
   */
  DataSource.prototype.read = function read(length) {};

  /**
   * @function
   * @param position
   */
  DataSource.prototype.seek = function seek(position) {};

  /**
   * @function
   * @param length
   * @param cb
   */
  DataSource.prototype.fetchBytes = function fetchBytes(length, cb) {};

  /* eslint-enable*/

  Peeracle.DataSource = DataSource;

  /**
   * @class
   * @memberof Peeracle
   * @constructor
   */
  function Listenable() {
    this.listeners = {};
  }

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.on = function on(type, listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  };

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.once = function once(type, listener) {
    var self = this;

    function wrappedListener() {
      self.off(type, wrappedListener);
      listener.apply(null, arguments);
    }

    wrappedListener.__originalListener = listener;
    this.on(type, wrappedListener);
  };

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.off = function off(type, listener) {
    if (this.listeners[type]) {
      if (listener) {
        this.listeners[type] = this.listeners[type].filter(function filterListener(
          l) {
          return l !== listener && l.__originalListener !== listener;
        });
      } else {
        delete this.listeners[type];
      }
    }
  };

  /**
   *
   * @param type
   */
  Listenable.prototype.emit = function emit(type) {
    var args;

    if (this.listeners[type]) {
      args = [].slice.call(arguments, 1);
      this.listeners[type].forEach(function applyListener(listener) {
        listener.apply(null, args);
      });
    }
  };

  Peeracle.Listenable = Listenable;

  function Manager() {

  }

  Peeracle.Manager = Manager;

  /**
   * @typedef {Object} Track
   * @property {number} id
   * @property {number} type
   * @property {string} codec
   * @property {number} width
   * @property {number} height
   * @property {number} numChannels
   * @property {number} samplingFrequency
   * @property {number} bitDepth
   */

  /**
   * @typedef {Object} Cue
   * @property {number} timecode
   * @property {number} track
   * @property {number} clusterOffset
   */

  /**
   * @interface
   * @memberof Peeracle
   * @namespace
   */
  function Media() {
    /** @member {string} */
    this.mimeType = null;

    /** @member {number} */
    this.timecodeScale = null;

    /** @member {number} */
    this.duration = null;

    /** @member {Array.<Track>} */
    this.tracks = null;

    /** @member {Array.<Cue>} */
    this.cues = null;

    /** @member {number} */
    this.width = null;

    /** @member {number} */
    this.height = null;

    /** @member {number} */
    this.numChannels = null;

    /** @member {number} */
    this.samplingFrequency = null;

    /** @member {number} */
    this.bitDepth = null;
  }

  /**
   *
   * @param {DataSource} dataSource
   * @param cb
   */
  Media.createInstance = function createInstance(dataSource, cb) {
    var m;
    var i;
    var medias = [];

    for (m in Media) {
      if (Media.hasOwnProperty(m) &&
        Media[m].hasOwnProperty('checkHeader')) {
        medias.push(Media[m]);
      }
    }

    if (!medias.length) {
      cb(null);
      return;
    }

    i = 0;
    medias[i].checkHeader(dataSource, function check(media) {
      if (media) {
        cb(media);
        return;
      }

      if (++i >= medias.length) {
        cb(null);
        return;
      }

      medias[i].checkHeader(dataSource, check);
    });
  };

  /* eslint-disable */

  /**
   *
   * @function
   * @param cb
   */
  Media.prototype.getInitSegment = function getInitSegment(cb) {};

  /**
   *
   * @function
   * @param timecode
   * @param cb
   */
  Media.prototype.getMediaSegment = function getMediaSegment(timecode, cb) {};

  /* eslint-enable */

  Peeracle.Media = Media;

  /**
   * @typedef {Object} EBMLTag
   * @property {number} id
   * @property {string} str
   * @property {number} headerOffset
   * @property {number} headerSize
   * @property {number} dataSize
   */

  /**
   *
   * @class
   * @constructor
   * @memberof Peeracle.Media
   * @implements {Peeracle.Media}
   */
  function WebM(dataSource) {
    /**
     * @member {Peeracle.DataSource}
     * @private
     */
    this.dataSource_ = dataSource;

    /**
     *
     * @member {EBMLTag}
     * @private
     */
    this.ebmlTag_ = null;

    /**
     *
     * @member {EBMLTag}
     * @private
     */
    this.clusterTag_ = null;

    /**
     *
     * @member {EBMLTag}
     * @private
     */
    this.infoTag_ = null;

    /**
     *
     * @member {EBMLTag}
     * @private
     */
    this.tracksTag_ = null;

    /**
     *
     * @member {EBMLTag}
     * @private
     */
    this.cuesTag_ = null;

    /**
     *
     * @member {EBMLTag}
     * @private
     */
    this.seekHeadTag_ = null;

    /**
     *
     * @member {string}
     */
    this.mimeType = '';

    /**
     *
     * @member {number}
     */
    this.timecodeScale = -1;

    /**
     *
     * @member {number}
     */
    this.duration = -1;

    /**
     *
     * @member {Array.<Track>}
     */
    this.tracks = [];

    /**
     *
     * @member {number}
     */
    this.width = -1;

    /**
     *
     * @member {number}
     */
    this.height = -1;

    /**
     *
     * @member {number}
     */
    this.numChannels = -1;

    /**
     *
     * @member {number}
     */
    this.samplingFrequency = -1;

    /**
     *
     * @member {number}
     */
    this.bitDepth = -1;

    /**
     * @member {Array.<Cue>}
     */
    this.cues = [];

    this.parse_();
  }

  WebM.TAG_SUFFIX_ = 'Tag_';

  WebM.CODEC_VP8 = 'V_VP8';
  WebM.CODEC_VP9 = 'V_VP9';
  WebM.CODEC_VORBIS = 'A_VORBIS';
  WebM.CODEC_OPUS = 'A_OPUS';

  WebM.ERR_INVALID_WEBM = 'Invalid WebM file';
  WebM.ERR_EMPTY_WEBM = 'Nothing to read after the EBML tag';

  WebM.prototype = Object.create(Media.prototype);
  WebM.prototype.constructor = WebM;

  /**
   *
   * @param {DataSource} dataSource
   * @param cb
   */
  WebM.checkHeader = function checkHeader(dataSource, cb) {
    dataSource.seek(0);
    dataSource.fetchBytes(4, function fetchBytesCb(bytes) {
      if (bytes && bytes.length === 4 &&
        bytes[0] === 0x1A &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xDF &&
        bytes[3] === 0xA3) {
        cb(new WebM(dataSource));
        return;
      }
      cb(null);
    });
  };

  /**
   * @param tag
   * @param bytes
   * @param start
   * @private
   */
  WebM.prototype.parseInfoTag_ = function parseInfoTag_(tag, bytes, start) {
    if (tag.str === '2ad7b1') {
      this.timecodeScale = this.readUInt_(bytes, start + tag.headerSize,
        tag.dataSize);
    } else if (tag.str === '4489') {
      this.duration = this.readFloat_(bytes, start + tag.headerSize,
        tag.dataSize);
    }
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseInfos_ = function parseInfos_(cb) {
    this.readTagBytes_(this.infoTag_, function parseInfosReadTagBytesCb(
      bytes) {
      var start = this.infoTag_.headerSize;
      var tag = this.readBufferedTag_(start, bytes);
      while (tag) {
        this.parseInfoTag_(tag, bytes, start);
        start += tag.headerSize + tag.dataSize;
        tag = this.readBufferedTag_(start, bytes);
      }
      cb();
    }.bind(this));
  };

  WebM.prototype.parseTrackVideo_ =
    function parseTrackVideo_(track, start, tag, bytes) {
      var videoStart = start + tag.headerSize;
      var videoTag = this.readBufferedTag_(videoStart, bytes);

      var tagMap = {
        'b0': ['width', this.readUInt_],
        'ba': ['height', this.readUInt_]
      };

      while (videoTag) {
        if (tagMap.hasOwnProperty(videoTag.str)) {
          track[tagMap[videoTag.str][0]] =
            tagMap[videoTag.str][1](bytes, videoStart + videoTag.headerSize,
              videoTag.dataSize);
        }
        videoStart += videoTag.headerSize + videoTag.dataSize;
        if (videoStart > start + tag.headerSize + tag.dataSize) {
          break;
        }
        videoTag = this.readBufferedTag_(videoStart, bytes);
      }
    };

  WebM.prototype.parseTrackAudio_ =
    function parseTrackAudio_(track, start, tag, bytes) {
      var audioStart = start + tag.headerSize;
      var audioTag = this.readBufferedTag_(audioStart, bytes);

      var tagMap = {
        '9f': ['numChannels', this.readUInt_],
        'b5': ['samplingFrequency', this.readFloat_],
        '6264': ['bitDepth', this.readUInt_]
      };

      while (audioTag) {
        if (tagMap.hasOwnProperty(audioTag.str)) {
          track[tagMap[audioTag.str][0]] =
            tagMap[audioTag.str][1](bytes, audioStart + audioTag.headerSize,
              audioTag.dataSize);
        }
        audioStart += audioTag.headerSize + audioTag.dataSize;
        if (audioStart > start + tag.headerSize + tag.dataSize) {
          break;
        }
        audioTag = this.readBufferedTag_(audioStart, bytes);
      }
    };

  WebM.prototype.parseTrack_ = function parseTrack_(start, tag, bytes) {
    var entryStart = start + tag.headerSize;
    var entryTag = this.readBufferedTag_(entryStart, bytes);
    var track = {
      id: -1,
      type: -1,
      codec: '',
      width: -1,
      height: -1,
      numChannels: -1,
      samplingFrequency: -1,
      bitDepth: -1
    };

    var tagMap = {
      'd7': ['id', this.readUInt_],
      '83': ['type', this.readUInt_],
      '86': ['codec', this.readUInt_]
    };

    while (entryTag) {
      if (tagMap.hasOwnProperty(entryTag.str)) {
        track[tagMap[entryTag.str][0]] =
          tagMap[entryTag.str][1](bytes, entryStart + entryTag.headerSize,
            entryTag.dataSize);
      } else if (entryTag.str === 'e0') {
        this.parseTrackVideo_(track, entryStart, entryTag, bytes);
        this.width = track.width;
        this.height = track.height;
      } else if (entryTag.str === 'e1') {
        this.parseTrackAudio_(track, entryStart, entryTag, bytes);
        this.numChannels = track.numChannels;
        this.samplingFrequency = track.samplingFrequency;
        this.bitDepth = track.bitDepth;
      }
      entryStart += entryTag.headerSize + entryTag.dataSize;
      if (entryStart > start +
        tag.headerSize + tag.dataSize) {
        break;
      }
      entryTag = this.readBufferedTag_(entryStart, bytes);
    }
    return track;
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseTracks_ = function parseTracks_(cb) {
    this.readTagBytes_(this.tracksTag_, function readBytesCb(bytes) {
      /** @type {Track} */
      var track;
      var trackStart = this.tracksTag_.headerSize;
      var trackTag = this.readBufferedTag_(trackStart, bytes);

      while (trackTag) {
        if (trackTag.str !== 'ae') {
          return;
        }

        track = this.parseTrack_(trackStart, trackTag, bytes);
        this.tracks.push(track);

        trackStart += trackTag.headerSize + trackTag.dataSize;
        if (trackStart > this.tracksTag_.headerSize + this.tracksTag_.dataSize) {
          break;
        }
        trackTag = this.readBufferedTag_(trackStart, bytes);
      }

      this.createMimeType_();
      cb();
    }.bind(this));
  };

  WebM.prototype.parseCueTrack_ = function parseCueTrack_(cue, start, tag,
    bytes) {
    var cueTrackStart = start + tag.headerSize;
    var cueTrackTag = this.readBufferedTag_(cueTrackStart, bytes);

    var tagMap = {
      'f7': ['id', this.readUInt_],
      'f1': ['type', this.readUInt_]
    };

    while (cueTrackTag) {
      if (tagMap.hasOwnProperty(cueTrackTag.str)) {
        cue[tagMap[cueTrackTag.str][0]] =
          tagMap[cueTrackTag.str][1](bytes,
            cueTrackStart + cueTrackTag.headerSize, cueTrackTag.dataSize);
      }
      cueTrackStart += cueTrackTag.headerSize + cueTrackTag.dataSize;
      if (cueTrackStart > start + tag.headerSize + tag.dataSize) {
        break;
      }
      cueTrackTag = this.readBufferedTag_(cueTrackStart, bytes);
    }
  };

  WebM.prototype.parseCue_ = function parseCue_(start, tag, bytes) {
    /** @type {Cue} */
    var cue = {
      timecode: -1,
      track: -1,
      clusterOffset: -1
    };

    var cuePointStart = start + tag.headerSize;
    var cuePointTag = this.readBufferedTag_(cuePointStart, bytes);

    while (cuePointTag) {
      if (cuePointTag.str === 'b3') {
        cue.timecode = this.readUInt_(bytes,
          cuePointStart + cuePointTag.headerSize, cuePointTag.dataSize);
      } else if (cuePointTag.str === 'b7') {
        this.parseCueTrack_(cue, cuePointStart + cuePointTag.headerSize,
          cuePointTag.dataSize, bytes);
      }
      cuePointStart += cuePointTag.headerSize + cuePointTag.dataSize;
      if (cuePointStart > start + tag.headerSize + tag.dataSize) {
        break;
      }
      cuePointTag = this.readBufferedTag_(cuePointStart, bytes);
    }
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseCues_ = function parseCues_(cb) {
    this.readTagBytes_(this.cuesTag_, function readBytesCb(bytes) {
      var cue;
      var cueStart = this.cuesTag_.headerSize;
      var cueTag = this.readBufferedTag_(cueStart, bytes);

      while (cueTag) {
        if (cueTag.str !== 'bb') {
          return;
        }

        cue = this.parseCue_();
        this.cues.push(cue);
        cueStart += cueTag.headerSize + cueTag.dataSize;
        if (cueStart > this.cuesTag_.headerSize + this.cuesTag_.dataSize) {
          break;
        }
        cueTag = this.readBufferedTag_(cueStart, bytes);
      }
      cb();
    }.bind(this));
  };

  WebM.prototype.parseEBMLSegmentInfo_ = function parseEBMLSegmentInfo_(cb) {
    var t;

    this.readNextTag_(function processSegmentTag(tag) {
      var tagMap = {
        '1f43b675': 'cluster',
        '1549a966': 'info',
        '1654ae6b': 'tracks',
        '1c53bb6b': 'cues',
        '114d9b74': 'seekHead'
      };

      if (!tag) {
        for (t = tagMap.length; t > 0; --t) {
          if (!this[tagMap[t] + WebM.TAG_SUFFIX_]) {
            // TODO: Create a special exception type for this
            cb(new Error('No ' + tagMap[t] + ' tag found'));
            return;
          }
        }

        this.parseInfos_(function parseInfosCb() {
          this.parseTracks_(function parseTracksCb() {
            this.parseCues_(function parseCuesCb() {
              this.ebmlTag_.dataSize =
                this.clusterTag_.headerOffset - this.ebmlTag_
                .headerSize;
            }.bind(this));
          }.bind(this));
        }.bind(this));
        return;
      }

      if (tagMap.hasOwnProperty(tag.str)) {
        this[tagMap[tag.str] + WebM.TAG_SUFFIX_] = tag;
      }

      this.dataSource_.read(tag.dataSize);
      this.readNextTag_(processSegmentTag.bind(this));
    }.bind(this));
  };

  WebM.prototype.parseEBML_ = function parseEBML_(cb) {
    this.dataSource_.read(this.ebmlTag_.dataSize);
    this.readNextTag_(function parseEBMLReadNextTagCb(tag) {
      if (!tag) {
        cb(new Error(WebM.ERR_EMPTY_WEBM));
        return;
      }

      if (tag.str !== '18538067') {
        this.dataSource_.read(tag.dataSize);
        this.readNextTag_(parseEBMLReadNextTagCb.bind(this));
        return;
      }

      this.parseEBMLSegmentInfo_(cb);
    }.bind(this));
  };

  WebM.prototype.parse_ = function parse_(cb) {
    this.dataSource_.seek(0);
    this.readNextTag_(function parseReadNextTagCb(tag) {
      if (!tag || tag.str !== '1a45dfa3') {
        cb(new Error(WebM.ERR_INVALID_WEBM));
        return;
      }
      this.ebmlTag_ = tag;
      this.parseEBML_(cb);
    }.bind(this));
  };

  /**
   *
   * @function
   * @param cb
   */
  WebM.prototype.getInitSegment = function getInitSegment(cb) {
    this.readTagBytes_(this.ebmlTag_, function readTagBytesCb(bytes) {
      cb(bytes);
    });
  };

  /**
   *
   * @param timecode
   * @param cb
   */
  WebM.prototype.getMediaSegment = function getMediaSegment(timecode, cb) {
    var i;
    var l;
    /** @type {Cue} */
    var cue = null;

    for (i = 0, l = this.cues.length; i < l; ++i) {
      if (this.cues[i].timecode === timecode) {
        cue = this.cues[i];
        break;
      }
    }

    if (!cue) {
      cb(null);
    }

    this.dataSource_.seek(this.seekHeadTag_.headerOffset + cue.clusterOffset);
    this.readNextTag_(function readNextTagCb(tag) {
      this.readTagBytes_(tag, function readTagBytesCb(bytes) {
        cb(bytes);
      });
    }.bind(this));
  };

  /**
   *
   * @private
   */
  WebM.prototype.createMimeType_ = function createMimeType_() {
    var i;
    var l;
    var track;
    var mimeType;
    var isVideo = false;
    var codecs = [];
    var type = '';

    for (i = 0, l = this.tracks.length; i < l; ++i) {
      track = this.tracks[i];
      if (track.type === 1) {
        isVideo = true;
      }

      if (track.codec === WebM.CODEC_VP8) {
        codecs.push('vp8');
      } else if (track.codec === WebM.CODEC_VP9) {
        codecs.push('vp9');
      } else if (track.codec === WebM.CODEC_VORBIS) {
        codecs.push('vorbis');
      } else if (track.codec === WebM.CODEC_OPUS) {
        codecs.push('opus');
      }
    }

    if (isVideo) {
      type = 'video/webm';
    } else {
      type = 'audio/webm';
    }

    mimeType = type + ';codecs="';
    for (i = 0; i < codecs.length; ++i) {
      mimeType += codecs[i];
      if (i + 1 !== codecs.length) {
        mimeType += ',';
      }
    }

    this.mimeType = mimeType + '"';
  };

  /**
   *
   * @param buffer
   * @param start
   * @param maxSize
   * @returns {*}
   * @private
   */
  WebM.prototype.readVariableInt_ = function readVariableInt_(buffer, start,
    maxSize) {
    var length;
    var readBytes = 1;
    var lengthMask = 0x80;
    var n = 1;
    var i = start;

    length = buffer[i];
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
      length = (length << 8) | buffer[++i];
    }

    return {
      length: readBytes,
      value: length
    };
  };

  /**
   *
   * @param start
   * @param buffer
   * @returns {EBMLTag}
   * @private
   */
  WebM.prototype.readBufferedTag_ = function readBufferedTag_(start, buffer) {
    /** @type {EBMLTag} */
    var tag = {};

    var result = this.readVariableInt_(buffer, start, 4);
    if (!result) {
      return null;
    }

    tag.id = result.value | (1 << (7 * result.length));
    tag.str = tag.id.toString(16);
    tag.headerSize = result.length;

    result = this.readVariableInt_(buffer, start + tag.headerSize, 8);
    tag.dataSize = result.value;
    tag.headerSize += result.length;
    return tag;
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.readNextTag_ = function readNextTag_(cb) {
    this.dataSource_.fetchBytes(12, function fetchBytesCb(bytes) {
      var headerOffset = this.dataSource_.offset;
      var tag;

      if (!bytes) {
        cb(null);
        return;
      }

      tag = this.readBufferedTag_(0, bytes);
      this.dataSource_.read(tag.headerSize);
      tag.headerOffset = headerOffset;
      cb(tag);
    }.bind(this));
  };

  /**
   *
   * @param buf
   * @param start
   * @returns {*}
   * @private
   */
  WebM.prototype.readFloat4_ = function readFloat4_(buf, start) {
    var i;
    var val = 0;
    var sign;
    var exponent;
    var significand;

    for (i = 0; i < 4; ++i) {
      val <<= 8;
      val |= buf[start + i] & 0xff;
    }

    sign = val >> 31;
    exponent = ((val >> 23) & 0xff) - 127;
    significand = val & 0x7fffff;
    if (exponent > -127) {
      if (exponent === 128) {
        if (significand === 0) {
          if (sign === 0) {
            return Number.POSITIVE_INFINITY;
          }
          return Number.NEGATIVE_INFINITY;
        }
        return NaN;
      }
      significand |= 0x800000;
    } else {
      if (significand === 0) {
        return 0;
      }
      exponent = -126;
    }

    return Math.pow(-1, sign) * (significand * Math.pow(2, -23)) *
      Math.pow(2, exponent);
  };

  /**
   *
   * @param buf
   * @param start
   * @returns {*}
   * @private
   */
  WebM.prototype.readFloat8_ = function readFloat8_(buf, start) {
    var i;
    var sign = (buf[start] >> 7) & 0x1;
    var exponent = (((buf[start] & 0x7f) << 4) |
      ((buf[start + 1] >> 4) & 0xf)) - 1023;

    var significand = 0;
    var shift = Math.pow(2, 6 * 8);

    significand += (buf[start + 1] & 0xf) * shift;
    for (i = 2; i < 8; ++i) {
      shift = Math.pow(2, (8 - i - 1) * 8);
      significand += (buf[start + i] & 0xff) * shift;
    }

    if (exponent > -1023) {
      if (exponent === 1024) {
        if (significand === 0) {
          if (sign === 0) {
            return Number.POSITIVE_INFINITY;
          }
          return Number.NEGATIVE_INFINITY;
        }
        return NaN;
      }
      significand += 0x10000000000000;
    } else {
      if (significand === 0) {
        return 0;
      }
      exponent = -1022;
    }

    return Math.pow(-1, sign) * (significand * Math.pow(2, -52)) *
      Math.pow(2, exponent);
  };

  /**
   *
   * @param buf
   * @param start
   * @param size
   * @returns {*}
   * @private
   */
  WebM.prototype.readFloat_ = function readFloat_(buf, start, size) {
    if (size === 4) {
      return this.readFloat4_(buf, start);
    } else if (size === 8) {
      return this.readFloat8_(buf, start);
    }
    return 0.0;
  };

  /**
   *
   * @param buf
   * @param start
   * @param size
   * @returns {*}
   * @private
   */
  WebM.prototype.readUInt_ = function readUInt_(buf, start, size) {
    var i;
    var val = 0;

    if (size < 1 || size > 8) {
      return null;
    }

    for (i = 0; i < size; ++i) {
      val <<= 8;
      val |= buf[start + i] & 0xff;
    }

    return val;
  };

  /**
   *
   * @param buf
   * @param start
   * @param size
   * @returns {*}
   * @private
   */
  WebM.prototype.readString_ = function readString_(buf, start, size) {
    var i;
    var val = '';

    if (size < 1 || size > 8) {
      return null;
    }

    for (i = 0; i < size; ++i) {
      val += String.fromCharCode(buf[start + i]);
    }

    return val;
  };

  /**
   *
   * @param tag
   * @param cb
   * @private
   */
  WebM.prototype.readTagBytes_ = function readTagBytes_(tag, cb) {
    this.dataSource_.seek(tag.headerOffset);
    this.dataSource_.fetchBytes(tag.headerSize + tag.dataSize, function fetchBytesCb(
      bytes) {
      if (!bytes) {
        cb(null);
        return;
      }

      this.dataSource_.read(tag.headerSize + tag.dataSize);
      cb(bytes);
    }.bind(this));
  };

  Peeracle.Media.WebM = WebM;

  /**
   * @typedef {Object} Segment
   * @property {number} timecode - Segment's timecode
   * @property {number} length - Segment's length
   * @property {*} checksum - Segment's checksum
   * @property {Array.<*>} chunks - Array of chunks' checksum
   */

  /**
   * @typedef {Object} Stream
   * @property {number} type - Stream type
   * @property {string} mimeType - Stream mime type for MediaSource API
   * @property {number} bandwidth - Stream bandwidth
   * @property {number} width - Video width
   * @property {number} height - Video height
   * @property {number} numChannels - Number of audio channels
   * @property {number} samplingFrequency - Audio sample rate
   * @property {number} chunksize - Stream fixed chunk size
   * @property {Uint8Array} init - Init segment bytes
   * @property {Array.<Segment>} segments - Array of media segments
   */

  /**
   * @typedef {Object} Header
   * @property {number} magic
   * @property {number} version
   * @property {string} cryptoId
   * @property {number} timecodeScale
   * @property {number} duration
   */

  /**
   * @class
   * @constructor
   * @memberof Peeracle
   */
  function Metadata() {
    /**
     * @member {*}
     * @readonly
     */
    this.id = null;

    /**
     * @member {Crypto}
     * @private
     */
    this.crypto_ = null;

    /**
     * @member {string}
     */
    this.cryptoId = 'crc32';

    /**
     * @member {Array.<string>}
     */
    this.trackers = [];

    /**
     * @member {number}
     */
    this.minChunkSize = 32 * 1024;

    /**
     * @member {number}
     */
    this.maxChunkSize = 256 * 1024;

    /**
     *
     * @member {number}
     */
    this.timecodeScale = -1;

    /**
     *
     * @member {number}
     */
    this.duration = -1;

    /**
     *
     * @member {Array.<Stream>}
     */
    this.streams = [];
  }

  /**
   * @function
   * @public
   * @return {number}
   */
  Metadata.prototype.getId = function getId() {
    if (this.id) {
      return this.id;
    }

    if (!this.crypto_) {
      this.crypto_ = Crypto.createInstance(this.cryptoId);
    }

    this.crypto_.init();
    // this.crypto_.update(this.initSegment);
    this.id = this.crypto_.finish();
    return this.id;
  };

  /**
   *
   * @param {Peeracle.Media} media
   * @returns {number}
   */
  Metadata.prototype.calculateChunkSize = function calculateChunkSize(media) {
    var i;
    var l;
    var cue;
    var cues = media.cues;
    var sum = 0;
    var last = 0;
    var total;

    for (i = 0, l = cues.length; i < l; ++i) {
      cue = cues[i];
      sum += cue.clusterOffset - last;
      last = cue.clusterOffset;
    }

    total = (sum / l);
    for (i = this.minChunkSize; i < this.maxChunkSize; i *= 2) {
      if (total > i) {
        continue;
      }
      break;
    }

    return i;
  };

  Metadata.prototype.addStreamNext_ =
    function addStreamNext_(stream, media, cb) {
      var i;
      var numCues = media.cues.length;
      var currentCue = 0;

      var timecode = media.cues[currentCue].timecode;
      media.getMediaSegment(timecode, function getMediaSegmentCb(bytes) {
        var clusterLength;
        var chunkLength;
        var cluster;
        var chunk;

        if (!bytes) {
          this.streams.push(stream);
          cb();
          return;
        }

        clusterLength = bytes.length;
        chunkLength = stream.chunksize;

        if (!this.crypto_) {
          this.crypto_ = Crypto.createInstance(this.cryptoId);
        }

        cluster = {
          timecode: timecode,
          length: clusterLength,
          checksum: this.crypto_.checksum(bytes),
          chunks: []
        };

        for (i = 0; i < clusterLength; i += chunkLength) {
          chunk = bytes.subarray(i, i + chunkLength);

          cluster.chunks.push(this.crypto_.checksum(chunk));

          if (clusterLength - i < chunkLength) {
            chunkLength = clusterLength - i;
          }
        }

        stream.segments.push(cluster);

        if (++currentCue >= numCues) {
          this.streams.push(stream);
          cb();
          return;
        }

        timecode = media.cues[currentCue].timecode;
        media.getMediaSegment(timecode, getMediaSegmentCb.bind(this));
      }.bind(this));
    };

  Metadata.prototype.addStreamFirst_ = function addStream(media, bytes, cb) {
    /** @type {Stream} */
    var stream = {
      type: 1,
      mimeType: media.mimeType,
      bandwidth: 0,
      width: media.width,
      height: media.height,
      numChannels: media.numChannels,
      samplingFrequency: media.samplingFrequency,
      chunksize: this.calculateChunkSize(media),
      init: bytes,
      segments: []
    };

    if (this.timecodeScale === -1) {
      this.timecodeScale = media.timecodeScale;
    }

    if (this.duration === -1) {
      this.duration = media.duration;
    }

    if (!media.cues.length) {
      this.streams.push(stream);
      cb();
      return;
    }

    this.addStreamNext_(stream, media, cb);
  };

  /**
   *
   * @param {Media} media
   * @param cb
   */
  Metadata.prototype.addStream = function addStream(media, cb) {
    media.getInitSegment(function getInitSegmentCb(bytes) {
      this.addStreamFirst_(media, bytes, cb);
    }.bind(this));
  };

  Peeracle.Metadata = Metadata;

  /**
   * @class
   * @memberof Peeracle
   * @constructor
   */
  function MetadataSerializer() {
    /**
     * @type {Crypto}
     * @private
     */
    this.crypto_ = null;

    /**
     * @type {BinaryStream}
     * @private
     */
    this.stream_ = null;
  }

  /**
   *
   * @param segment
   * @private
   */
  MetadataSerializer.prototype.serializeSegment_ =
    function serializeSegment_(segment) {
      var ci;
      var cl;

      this.stream_.writeUInt32(segment.timecode);
      this.stream_.writeUInt32(segment.length);
      this.crypto_.serialize(segment.checksum, this.stream_);
      this.stream_.writeUInt32(segment.chunks.length);

      for (ci = 0, cl = segment.chunks.length; ci < cl; ++ci) {
        this.crypto_.serialize(segment.chunks[ci], this.stream_);
      }
    };

  /**
   *
   * @param {Stream} stream
   * @private
   */
  MetadataSerializer.prototype.serializeStream_ =
    function serializeStream_(stream) {
      var i;
      var l;

      this.stream_.writeByte(stream.type);
      this.stream_.writeString(stream.mimeType);
      this.stream_.writeUInt32(stream.bandwidth);
      this.stream_.writeInt32(stream.width);
      this.stream_.writeInt32(stream.height);
      this.stream_.writeInt32(stream.numChannels);
      this.stream_.writeInt32(stream.samplingFrequency);
      this.stream_.writeUInt32(stream.chunksize);

      this.stream_.writeUInt32(stream.init.length);
      this.stream_.writeBytes(stream.init);

      this.stream_.writeUInt32(stream.segments.length);
      for (i = 0, l = stream.segments.length; i < l; ++i) {
        this.serializeSegment_(stream.segments[i]);
      }
    };

  /**
   *
   * @param {Metadata} metadata
   * @private
   */
  MetadataSerializer.prototype.serializeStreams_ =
    function serializeStreams_(metadata) {
      var i;
      var l = metadata.streams.length;

      this.stream_.writeUInt32(l);
      for (i = 0; i < l; ++i) {
        this.serializeStream_(metadata.streams[i]);
      }
    };

  /**
   *
   * @param {Metadata} metadata
   * @private
   */
  MetadataSerializer.prototype.serializeTrackers_ =
    function serializeTrackers_(metadata) {
      var i;
      var trackers = metadata.trackers;

      this.stream_.writeUInt32(trackers.length);
      for (i = 0; i < trackers.length; ++i) {
        this.stream_.writeString(trackers[i]);
      }
    };

  /**
   *
   * @param {Metadata} metadata
   * @private
   */
  MetadataSerializer.prototype.serializeHeader_ =
    function serializeHeader_(metadata) {
      this.crypto_ = Crypto.createInstance(metadata.cryptoId);
      if (!this.crypto_) {
        throw 'Unknown checksum ' + metadata.cryptoId;
      }

      this.stream_.writeUInt32(1347568460);
      this.stream_.writeUInt32(2);
      this.stream_.writeString(metadata.cryptoId);
      this.stream_.writeUInt32(metadata.timecodeScale);
      this.stream_.writeFloat8(metadata.duration);
    };

  /**
   * @param {Metadata} metadata
   * @returns {Uint8Array}
   * @private
   */
  MetadataSerializer.prototype.allocate_ = function allocate_(metadata) {
    // TODO: Fix this into something better
    var i;
    var seg;
    var ch;
    var chunks;
    var stream;
    var streams;
    var segments;
    var length = 4 + 4 + (metadata.cryptoId.length + 1) + 4 + 8;

    var trackers = metadata.trackers;
    length += 4;
    for (i = 0; i < trackers.length; ++i) {
      length += trackers[i].length + 1;
    }

    streams = metadata.streams;
    length += 4;
    for (i = 0; i < streams.length; ++i) {
      stream = streams[i];

      length += 1 + (stream.mimeType.length + 1) + 4 + 4 + 4 + 4 + 4 + 4 +
        4 + stream.init.length;

      segments = stream.segments;
      length += 4;

      for (seg = 0; seg < segments.length; ++seg) {
        length += 4 + 4 + (4);

        chunks = segments[seg].chunks;
        length += 4;
        for (ch = 0; ch < chunks.length; ++ch) {
          length += 4;
        }
      }
    }

    return new Uint8Array(length);
  };

  /**
   *
   * @param {Metadata} metadata
   * @returns {Uint8Array}
   */
  MetadataSerializer.prototype.serialize = function serialize(metadata) {
    this.stream_ = new BinaryStream(this.allocate_(metadata));

    this.serializeHeader_(metadata);
    this.serializeTrackers_(metadata);
    this.serializeStreams_(metadata);

    return this.stream_.bytes;
  };

  Peeracle.MetadataSerializer = MetadataSerializer;

  /**
   * @class
   * @memberof Peeracle
   * @constructor
   */
  function MetadataUnserializer() {
    /**
     * @type {Crypto}
     * @private
     */
    this.crypto_ = null;

    /**
     * @type {BinaryStream}
     * @private
     */
    this.stream_ = null;
  }

  /**
   *
   * @returns {Segment}
   * @private
   */
  MetadataUnserializer.prototype.unserializeSegment_ =
    function unserializeSegment_() {
      /** @type {Segment} */
      var segment = {};
      var numChunks;
      var i;
      var chunk;

      segment.timecode = this.stream_.readUInt32();
      segment.length = this.stream_.readUInt32();
      segment.checksum = this.crypto_.unserialize(this.stream_);

      segment.chunks = [];
      numChunks = this.stream_.readUInt32();
      for (i = 0; i < numChunks; ++i) {
        chunk = this.crypto_.unserialize(this.stream_);
        segment.chunks.push(chunk);
      }

      return segment;
    };

  MetadataUnserializer.prototype.unserializeStreamInit_ =
    function unserializeStreamInit_(stream) {
      /** @type {number} */
      var i;
      var initLength = this.stream_.readUInt32();
      stream.init = new Uint8Array(initLength);
      for (i = 0; i < initLength; ++i) {
        stream.init[i] = this.stream_.readByte();
      }
    };

  MetadataUnserializer.prototype.unserializeStreamSegments_ =
    function unserializeStreamSegments_(stream) {
      var i;
      var segment;
      var numSegments = this.stream_.readUInt32();

      stream.segments = [];
      for (i = 0; i < numSegments; ++i) {
        segment = this.unserializeSegment_();
        stream.segments.push(segment);
      }
    };

  /**
   *
   * @returns {Stream}
   * @private
   */
  MetadataUnserializer.prototype.unserializeStream_ =
    function unserializeStream_() {
      /** @type {Stream} */
      var stream = {};

      stream.type = this.stream_.readByte();
      stream.mimeType = this.stream_.readString();
      stream.bandwidth = this.stream_.readUInt32();
      stream.width = this.stream_.readInt32();
      stream.height = this.stream_.readInt32();
      stream.numChannels = this.stream_.readInt32();
      stream.samplingFrequency = this.stream_.readInt32();
      stream.chunksize = this.stream_.readUInt32();

      this.unserializeStreamInit_(stream);
      this.unserializeStreamSegments_(stream);
      return stream;
    };

  /**
   *
   * @returns {Array.<Stream>}
   * @private
   */
  MetadataUnserializer.prototype.unserializeStreams_ =
    function unserializeStreams_() {
      var i;
      var stream;
      /** @type Array.<Stream> */
      var streams = [];
      var numStreams = this.stream_.readUInt32();

      for (i = 0; i < numStreams; ++i) {
        stream = this.unserializeStream_();
        streams.push(stream);
      }
      return streams;
    };

  /**
   *
   * @returns {Array.<string>}
   * @private
   */
  MetadataUnserializer.prototype.unserializeTrackers_ =
    function unserializeTrackers_() {
      var i;
      var numTrackers = this.stream_.readUInt32();
      var trackers = [];

      for (i = 0; i < numTrackers; ++i) {
        trackers.push(this.stream_.readString());
      }

      return trackers;
    };

  /**
   * @returns {Header}
   * @private
   */
  MetadataUnserializer.prototype.unserializeHeader_ =
    function unserializeHeader_() {
      /** @type {Header} */
      var header = {};

      header.magic = this.stream_.readUInt32();
      if (header.magic !== 1347568460) {
        throw new Error('Wrong file header');
      }

      header.version = this.stream_.readUInt32();
      header.cryptoId = this.stream_.readString();

      this.crypto_ = Crypto.createInstance(header.cryptoId);
      if (!this.crypto_) {
        throw new Error('Unknown checksum ' + header.cryptoId);
      }

      header.timecodeScale = this.stream_.readUInt32();
      header.duration = this.stream_.readFloat8();
      return header;
    };

  /**
   * @param {BinaryStream} stream
   * @param {Metadata} metadata
   */
  MetadataUnserializer.prototype.unserialize =
    function unserialize(stream, metadata) {
      var header;
      var trackers;
      var streams;

      this.stream_ = stream;

      header = this.unserializeHeader_();
      trackers = this.unserializeTrackers_();
      streams = this.unserializeStreams_();

      metadata.timecodeScale = header.timecodeScale;
      metadata.duration = header.duration;
      metadata.trackers = trackers;
      metadata.streams = streams;
    };

  Peeracle.MetadataUnserializer = MetadataUnserializer;

  /**
   * @class
   * @constructor
   * @memberof Peeracle
   */
  function Peer() {

  }

  Peer.prototype = Object.create(Listenable.prototype);

  Peeracle.Peer = Peer;

  /*
   function Peer() {
   var _subscribers = [];
   var _peerConnection;
   var _signalDataChannel;
   var _mediaDataChannel;
   var _ready;

   var _onIceCandidate = function (event) {
   if (!_peerConnection || !event) {
   return;
   }

   var ice = event.candidate;
   _subscribers.forEach(function (subscriber) {
   subscriber.onIceCandidate(ice);
   });
   };


   var _onMediaError = function (error) {
   console.log('Peeracle.MediaChannel onerror', error);
   };

   var _onMediaMessage = function (event) {
   _subscribers.forEach(function (subscriber) {
   subscriber.onData(new Uint8Array(event.data));
   });
   };

   var _onMediaOpen = function (event) {
   if ((event.target && event.target.readyState.toLowerCase() === 'open') || event.type === 'open') {
   _ready++;
   if (_ready === 2) {
   console.log('we are ready.');
   _subscribers.forEach(function (subscriber) {
   subscriber.onReady();
   });
   }
   }
   };

   var _onMediaClose = function () {
   console.log('Peeracle.MediaChannel onclose');
   };

   var _setMediaDataChannel = function (dataChannel) {
   dataChannel.onerror = _onMediaError;
   dataChannel.onmessage = _onMediaMessage;
   dataChannel.onopen = _onMediaOpen;
   dataChannel.onclose = _onMediaClose;
   };

   var _onSignalError = function (error) {
   console.log('Peeracle.SignalChannel onerror', error);
   };

   var _onSignalMessage = function (event) {
   var data = JSON.parse(event.data);
   if (data.type === 'request') {
   _subscribers.forEach(function (subscriber) {
   subscriber.onRequest(data.cluster, data.chunk);
   });
   }
   };

   var _onSignalOpen = function (event) {
   if ((event.target && event.target.readyState.toLowerCase() === 'open') || event.type === 'open') {
   _ready++;
   if (_ready === 2) {
   console.log('we are ready.');
   _subscribers.forEach(function (subscriber) {
   subscriber.onReady();
   });
   }
   }
   };

   var _onSignalClose = function () {
   console.log('Peeracle.SignalChannel onclose');
   };

   var _setSignalDataChannel = function (dataChannel) {
   dataChannel.onerror = _onSignalError;
   dataChannel.onmessage = _onSignalMessage;
   dataChannel.onopen = _onSignalOpen;
   dataChannel.onclose = _onSignalClose;
   };

   var _onDataChannel = function (event) {
   if (!event || !event.channel) {
   return;
   }

   if (event.channel.label === 'signal') {
   _signalDataChannel = event.channel;
   _setSignalDataChannel(_signalDataChannel);
   } else if (event.channel.label === 'media') {
   _mediaDataChannel = event.channel;
   _setMediaDataChannel(_mediaDataChannel);
   }
   };

   var _createDataChannels = function () {
   _signalDataChannel = _peerConnection.createDataChannel('signal');
   _mediaDataChannel = _peerConnection.createDataChannel('media');

   _setSignalDataChannel(_signalDataChannel);
   _setMediaDataChannel(_mediaDataChannel);
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
   _peerConnection.ondatachannel = _onDataChannel;
   _ready = 0;
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
   _createDataChannels();
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

   var request = function (cluster, chunk) {
   _signalDataChannel.send(JSON.stringify({type: 'request', cluster: cluster, chunk: chunk}));
   };

   var sendData = function (data) {
   var index = 0;
   var size = 16384;
   var process = setInterval(function () {
   if (_mediaDataChannel.bufferedAmount) {
   return;
   }

   if (index + size > data.length) {
   size = data.length - index;
   clearInterval(process);
   }

   _mediaDataChannel.send(data.subarray(index, index + size));
   index += size;
   }, 1);
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
   request: request,
   sendData: sendData,
   close: close
   };
   }*/

  /**
   * @class
   * @constructor
   */
  function PeerConnection() {

  }

  PeerConnection.prototype = Object.create(Listenable.prototype);
  PeerConnection.prototype.constructor = PeerConnection;

  Peeracle.PeerConnection = PeerConnection;

  var Tracker = {};

  Peeracle.Tracker = Tracker;

  /**
   * @class
   * @memberof Peeracle.Tracker
   * @augments Listenable
   * @constructor
   */
  function Client() {
    this.url_ = null;
    this.ws_ = null;
  }

  Client.prototype = Object.create(Listenable.prototype);
  Client.prototype.constructor = Client;

  Client.prototype.onOpen_ = function onOpen_() {
    console.log('[Peeracle.Tracker.Client] onOpen');
    this.ws_.send(new Uint8Array([0, 0]));
  };

  Client.prototype.onMessage_ = function onMessage_(e) {
    var data = e.data;
    console.log('[Peeracle.Tracker.Client] onMessage', data);
  };

  Client.prototype.onError_ = function onError_() {
    console.log('[Peeracle.Tracker.Client] onError');
  };

  Client.prototype.onClose_ = function onClose_(e) {
    var code = e.code;
    var reason = e.reason;
    console.log('[Peeracle.Tracker.Client] onClose', code, reason);
  };

  Client.prototype.connect = function connect(url) {
    this.url_ = url;

    this.ws_ = new WebSocket(this.url_, 'prcl-0.0.1', this.url_);
    this.ws_.onopen = this.onOpen_.bind(this);
    this.ws_.onmessage = this.onMessage_.bind(this);
    this.ws_.onerror = this.onError_.bind(this);
    this.ws_.onclose = this.onClose_.bind(this);
  };

  Peeracle.Tracker.Client = Client;

  /**
   * @class
   * @param {Uint8Array?} bytes
   * @constructor
   */
  function Message(bytes) {
    /**
     * @member {Message.Type}
     */
    this.type = Message.Type.None;

    /**
     * @member {?BinaryStream}
     * @private
     */
    this.stream_ = null;

    if (bytes && typeof bytes === ArrayBuffer) {
      this.stream_ = new BinaryStream(bytes);
      // this.readFromBytes_(bytes);
    }
  }

  /**
   * @enum {number}
   */
  Message.Type = {
    None: 0,
    Hello: 1,
    Welcome: 2
  };

  Peeracle.Tracker.Message = Message;

  Math.trunc = Math.trunc || function trunc(x) {
    return x < 0 ? Math.ceil(x) : Math.floor(x);
  };

  /**
   * @class
   * @constructor
   */
  function Utils() {}

  /**
   *
   * @param x
   * @returns {number}
   */
  Utils.trunc = function utilsTrunc(x) {
    return Math.trunc(x);
  };

  Peeracle.Utils = Utils;
})();
