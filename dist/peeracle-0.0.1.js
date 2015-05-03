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

var Peeracle = {};

var RTCPeerConnection = window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.RTCPeerConnection;

var RTCSessionDescription = window.mozRTCSessionDescription ||
  window.webkitRTCSessionDescription ||
  window.RTCSessionDescription;

var RTCIceCandidate = window.mozRTCIceCandidate ||
  window.webkitRTCIceCandidate ||
  window.RTCIceCandidate;

Peeracle.BinaryStream = (function () {

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

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readByte = function () {
    if (this.offset_ >= this.length_) {
      throw 'Index out of bounds';
    }
    return this.bytes[this.offset_++];
  };

  /**
   * @param value
   */
  BinaryStream.prototype.writeByte = function (value) {
    if (this.offset_ >= this.length_) {
      throw 'Index out of bounds';
    }
    this.bytes.set([value], this.offset_++);
  };

  /**
   * @param length
   * @returns {Uint8Array}
   */
  BinaryStream.prototype.readBytes = function (length) {
    if (this.offset_ >= this.offset_ + this.length_) {
      throw 'Index out of bounds';
    }
    var bytes = this.bytes.slice(this.offset_, length);
    this.offset_ += length;
    return bytes;
  };

  /**
   * @param {Uint8Array} bytes
   */
  BinaryStream.prototype.writeBytes = function (bytes) {
    var length = bytes.length;
    if (this.offset_ >= this.offset_ + length) {
      throw 'Index out of bounds';
    }
    this.bytes.set(bytes, this.offset_);
    this.offset_ += length;
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readFloat8 = function () {
    var number = this.readBytes(8);
    var sign = (number[0] >> 7) & 0x1;
    var exponent = (((number[0] & 0x7f) << 4) |
      ((number[1] >> 4) & 0xf)) - 1023;

    var significand = 0;
    var shift = Math.pow(2, 6 * 8);
    significand += (number[1] & 0xf) * shift;
    for (var i = 2; i < 8; ++i) {
      shift = Math.pow(2, (8 - i - 1) * 8);
      significand += (number[i] & 0xff) * shift;
    }

    if (exponent > -1023) {
      if (exponent === 1024) {
        if (significand === 0) {
          if (sign === 0) {
            return Number.POSITIVE_INFINITY;
          } else {
            return Number.NEGATIVE_INFINITY;
          }
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
   * @param {number} value
   */
  BinaryStream.prototype.writeFloat8 = function (value) {
    var hiWord = 0, loWord = 0;
    switch (value) {
      case Number.POSITIVE_INFINITY:
        hiWord = 0x7FF00000;
        break;
      case Number.NEGATIVE_INFINITY:
        hiWord = 0xFFF00000;
        break;
      case +0.0:
        hiWord = 0x40000000;
        break;
      case -0.0:
        hiWord = 0xC0000000;
        break;
      default:
        if (Number.isNaN(value)) {
          hiWord = 0x7FF80000;
          break;
        }

        if (value <= -0.0) {
          hiWord = 0x80000000;
          value = -value;
        }

        var exponent = Math.floor(Math.log(value) / Math.log(2));
        var significand = Math.floor((value / Math.pow(2, exponent)) * Math.pow(2, 52));

        loWord = significand & 0xFFFFFFFF;
        significand /= Math.pow(2, 32);

        exponent += 1023;
        if (exponent >= 0x7FF) {
          exponent = 0x7FF;
          significand = 0;
        } else if (exponent < 0) {
          exponent = 0;
        }

        hiWord = hiWord | (exponent << 20);
        hiWord = hiWord | (significand & ~(-1 << 20));
        break;
    }

    this.writeUInt32(hiWord);
    this.writeUInt32(loWord);
  };

  /**
   * @param {boolean?} unsigned
   * @returns {number}
   */
  BinaryStream.prototype.readInt32 = function (unsigned) {
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
  BinaryStream.prototype.writeInt32 = function (value, unsigned) {
    var l = 0;
    var bytes = new Uint8Array(4);

    if (unsigned) {
      value = value >>> 0;
    }

    while (l < 4) {
      bytes[l] = (value & 0xFF);
      value = value >> 8;
      ++l;
    }

    this.writeBytes(bytes);
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readUInt32 = function () {
    return this.readInt32(true);
  };

  /**
   * @param {number} value
   */
  BinaryStream.prototype.writeUInt32 = function (value) {
    this.writeInt32(value, true);
  };

  /**
   * @param length
   * @returns {string}
   */
  BinaryStream.prototype.readString = function (length) {
    var str = '';
    if (length) {
      var bytes = this.readBytes(length);
      for (var i = 0; i < length; ++i) {
        str += String.fromCharCode(bytes[i]);
      }
      return str;
    }

    var c = this.readByte();
    while (c) {
      str += String.fromCharCode(c);
      c = this.readByte();
    }
    return str;
  };

  /**
   * @param {string} value
   */
  BinaryStream.prototype.writeString = function (value) {
    var length = value.length;
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; ++i) {
      bytes[i] = value.charCodeAt(i);
    }
    this.writeBytes(bytes);
  };

  return BinaryStream;
})();

Peeracle.Crypto = (function () {

  /**
   * @interface
   * @memberof Peeracle
   * @namespace
   */
  function Crypto() {
  }

  /**
   *
   * @param id
   * @returns {?Crypto}
   */
  Crypto.createInstance = function (id) {
    for (var c in Crypto) {
      if (Crypto.hasOwnProperty(c) &&
        Crypto[c].hasOwnProperty('getIdentifier') &&
        Crypto[c].getIdentifier() === id) {
        return new Crypto[c]();
      }
    }
    return null;
  };

  /**
   * @function
   * @param array
   */
  Crypto.prototype.checksum = function (array) {
  };

  /**
   * @function
   */
  Crypto.prototype.init = function () {
  };

  /**
   * @function
   * @param array
   */
  Crypto.prototype.update = function (array) {
  };

  /**
   * @function
   */
  Crypto.prototype.finish = function () {
  };

  /**
   *
   * @param value
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.serialize = function (value, binaryStream) {
  };

  /**
   *
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.unserialize = function (binaryStream) {
  };

  return Crypto;
})();

Peeracle.Crypto.Crc32 = (function () {

  var Crypto = Peeracle.Crypto;

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

  /**
   *
   * @returns {string}
   */
  Crc32.getIdentifier = function () {
    return 'crc32';
  };

  /**
   * Generate the crc32 table.
   *
   * @function
   * @private
   */
  Crc32.prototype.generateCrc32Table_ = function () {
    var c;
    this.crcTable_ = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) {
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
  Crc32.prototype.checksum = function (array) {
    this.init();
    this.update(array);
    return this.finish();
  };

  /**
   * Initialize the checksum algorithm.
   *
   * @function
   */
  Crc32.prototype.init = function () {
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
  Crc32.prototype.update = function (array) {
    var keys = Object.keys(array);
    for (var i = 0, l = keys.length; i < l; ++i) {
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
  Crc32.prototype.finish = function () {
    return (this.crc_ ^ (-1)) >>> 0;
  };

  /**
   * Convert the checksum to bytes.
   *
   * @function
   * @param value
   * @param {BinaryStream} binaryStream
   */
  Crc32.prototype.serialize = function (value, binaryStream) {
    return binaryStream.writeUInt32(value);
  };

  /**
   * Read the checksum from bytes.
   *
   * @function
   * {BinaryStream} binaryStream
   * @returns {*}
   */
  Crc32.prototype.unserialize = function (binaryStream) {
    return binaryStream.readUInt32();
  };

  return Crc32;
})();

Peeracle.DataSource = (function () {

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
  DataSource.prototype.read = function (length) {
  };

  /**
   * @function
   * @param position
   */
  DataSource.prototype.seek = function (position) {
  };

  /**
   * @function
   * @param length
   * @param cb
   */
  DataSource.prototype.fetchBytes = function (length, cb) {
  };

  return DataSource;
})();

Peeracle.DataSource.File = (function () {

  /** @type {DataSource} */
  var DataSource = Peeracle.DataSource;

  /**
   * @class
   * @memberof Peeracle.DataSource
   * @implements {Peeracle.DataSource}
   * @param {Blob|string} handle
   * @constructor
   */
  function File(handle) {
    /**
     * @type {*}
     * @private
     */
    this.handle_ = handle;

    /**
     * @readonly
     * @member {number}
     */
    this.offset = 0;

    /**
     * @readonly
     * @member {number}
     */
    this.length = (typeof handle !== 'string') ? handle.size : -1;

  }

  File.prototype = Object.create(DataSource.prototype);
  File.prototype.constructor = File;

  /**
   *
   * @param length
   */
  File.prototype.read = function (length) {
    this.offset += length;
  };

  /**
   *
   * @param position
   */
  File.prototype.seek = function (position) {
    this.offset = position;
  };

  /**
   *
   * @param length
   * @param cb
   * @private
   */
  /**
   *
   * @param length
   * @param cb
   */
  File.prototype.fetchBytes = function (length, cb) {
    if (this.length > -1 && this.offset + length > this.length) {
      cb(null);
      return;
    }

      var reader = new FileReader();
      reader.onload = function (e) {
        cb(new Uint8Array(e.target.result));
      };
      reader.readAsArrayBuffer(this.handle_.slice(this.offset, this.offset + length));
  };

  return File;
})();

Peeracle.DataSource.Http = (function () {

  /** @type {DataSource} */
  var DataSource = Peeracle.DataSource;
  /**
   * @class
   * @memberof Peeracle.DataSource
   * @implements {Peeracle.DataSource}
   * @param {string} handle
   * @constructor
   */
  function Http(handle) {
    /**
     * @member {number}
     * @readonly
     */
    this.offset = 0;

    /**
     * @member {number}
     * @readonly
     */
    this.length = 0;

    /**
     * @member {string}
     * @readonly
     * @private
     */
    this.url_ = handle;
  }

  Http.prototype = Object.create(DataSource.prototype);
  Http.prototype.constructor = Http;

  /**
   * @function
   * @param length
   */
  Http.prototype.read = function (length) {
    this.offset += length;
  };

  /**
   * @function
   * @param position
   */
  Http.prototype.seek = function (position) {
    this.offset = position;
  };

  /**
   * @function
   * @param length
   * @param cb
   */
  Http.prototype.fetchBytes = function (length, cb) {
    /** @type {XMLHttpRequest} */
    var r = new XMLHttpRequest();
    var range = this.offset + '-' + (this.offset + (length - 1));

    r.open('GET', this.url_);
    r.setRequestHeader('Range', 'bytes=' + range);
    r.responseType = 'arraybuffer';
    r.onload = function () {
      if (r.status === 206) {
        var bytes = new Uint8Array(r.response);
        cb(bytes);
        return;
      }
      cb(null);
    };
    r.send();
  };

  return Http;
})();

Peeracle.Listenable = (function () {

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
  Listenable.prototype.on = function (type, listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  };

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.once = function (type, listener) {
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
  Listenable.prototype.off = function (type, listener) {
    if (this.listeners[type]) {
      if (listener) {
        this.listeners[type] = this.listeners[type].filter(function (l) {
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
  Listenable.prototype.emit = function (type) {
    if (this.listeners[type]) {
      var args = [].slice.call(arguments, 1);
      this.listeners[type].forEach(function (listener) {
        listener.apply(null, args);
      });
    }
  };

  return Listenable;
})();

Peeracle.Media = (function () {

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
    this.mimeType = null;
    this.timecodeScale = null;
    this.duration = null;
    this.tracks = null;
    this.cues = null;
    this.width = null;
    this.height = null;
    this.numChannels = null;
    this.samplingFrequency = null;
    this.bitDepth = null;
  }

  /**
   *
   * @param {DataSource} dataSource
   * @param cb
   */
  Media.createInstance = function (dataSource, cb) {
    var medias = [];
    for (var m in Media) {
      if (Media.hasOwnProperty(m) &&
        Media[m].hasOwnProperty('checkHeader')) {
        medias.push(Media[m]);
      }
    }

    if (!medias.length) {
      cb(null);
      return;
    }

    var i = 0;
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

  /**
   *
   * @function
   * @param cb
   */
  Media.prototype.getInitSegment = function (cb) {
    throw 'Media: method getInitSegment(cb) not implemented';
  };

  /**
   *
   * @function
   * @param cb
   */
  Media.prototype.getMediaSegment = function (timecode, cb) {
    throw 'Media: method getMediaSegment(cb) not implemented';
  };

  return Media;
})();

Peeracle.Media.WebM = (function () {

  /**
   * @typedef {Object} EBMLTag
   * @property {number} id
   * @property {string} str
   * @property {number} headerOffset
   * @property {number} headerSize
   * @property {number} dataSize
   */

  /** @type {Media} **/
  var Media = Peeracle.Media;

  /**
   *
   * @class
   * @constructor
   * @memberof Peeracle.Media
   * @implements {Peeracle.Media}
   */
  function WebM(dataSource) {
    /**
     * @type {Peeracle.DataSource}
     * @private
     */
    this.dataSource_ = dataSource;

    /**
     *
     * @type {EBMLTag}
     * @private
     */
    this.clusterTag_ = null;

    /**
     *
     * @type {EBMLTag}
     * @private
     */
    this.infoTag_ = null;

    /**
     *
     * @type {EBMLTag}
     * @private
     */
    this.tracksTag_ = null;

    /**
     *
     * @type {EBMLTag}
     * @private
     */
    this.cuesTag_ = null;

    /**
     *
     * @type {EBMLTag}
     * @private
     */
    this.seekHeadTag_ = null;

    /**
     *
     * @type {string}
     */
    this.mimeType = '';

    /**
     *
     * @type {number}
     */
    this.timecodeScale = -1;

    /**
     *
     * @type {number}
     */
    this.duration = -1;

    /**
     *
     * @type {Array.<Track>}
     */
    this.tracks = [];

    /**
     *
     * @type {number}
     */
    this.width = -1;

    /**
     *
     * @type {number}
     */
    this.height = -1;

    /**
     *
     * @type {number}
     */
    this.numChannels = -1;

    /**
     *
     * @type {number}
     */
    this.samplingFrequency = -1;

    /**
     *
     * @type {number}
     */
    this.bitDepth = -1;

    /**
     * @type {Array.<Cue>}
     */
    this.cues = [];
  }

  WebM.prototype = Object.create(Media.prototype);
  WebM.prototype.constructor = WebM;

  /**
   *
   * @param {DataSource} dataSource
   * @param cb
   */
  WebM.checkHeader = function (dataSource, cb) {
    dataSource.seek(0);
    dataSource.fetchBytes(4, function (bytes) {
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
   *
   * @param type
   * @returns {*}
   * @private
   */
  WebM.prototype.getTrack_ = function (type) {
    for (var i = 0; i < this.tracks.length; ++i) {
      if (this.tracks[i].type === type) {
        return this.tracks[i];
      }
    }
    return null;
  };

  /**
   * @param tag
   * @param bytes
   * @param start
   * @private
   */
  WebM.prototype.parseInfoTag_ = function (tag, bytes, start) {
    if (tag.str === '2ad7b1') {
      this.timecodeScale = this.readUInt_(bytes,
        start + tag.headerSize, tag.dataSize);
      console.log('TimecodeScale: ', this.timecodeScale);
    } else if (tag.str === '4489') {
      this.duration = this.readFloat_(bytes,
        start + tag.headerSize, tag.dataSize);
      console.log('Duration: ', this.duration);
    }
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseInfos_ = function (cb) {
    this.readTagBytes_(this.infoTag_, function (bytes) {
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

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseTracks_ = function (cb) {
    this.readTagBytes_(this.tracksTag_, function (bytes) {
      var trackStart = this.tracksTag_.headerSize;
      var trackTag = this.readBufferedTag_(trackStart, bytes);

      while (trackTag) {
        if (trackTag.str !== 'ae') {
          return;
        }

        /** @type {Track} */
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

        var entryStart = trackStart + trackTag.headerSize;
        var entryTag = this.readBufferedTag_(entryStart, bytes);
        while (entryTag) {
          if (entryTag.str === 'd7') {
            track.id = this.readUInt_(bytes,
              entryStart + entryTag.headerSize, entryTag.dataSize);
          } else if (entryTag.str === '83') {
            track.type = this.readUInt_(bytes,
              entryStart + entryTag.headerSize, entryTag.dataSize);
          } else if (entryTag.str === '86') {
            track.codec = this.readString_(bytes,
              entryStart + entryTag.headerSize, entryTag.dataSize);
          } else if (entryTag.str === 'e0') {
            var videoStart = entryStart + entryTag.headerSize;
            var videoTag = this.readBufferedTag_(videoStart, bytes);
            while (videoTag) {
              if (track.width === -1 &&
                (videoTag.str === 'b0' || videoTag.str === '54b0')) {
                track.width = this.readUInt_(bytes,
                  videoStart + videoTag.headerSize, videoTag.dataSize);
              } else if (track.height === -1 &&
                (videoTag.str === 'ba' || videoTag.str === '54ba')) {
                track.height = this.readUInt_(bytes,
                  videoStart + videoTag.headerSize, videoTag.dataSize);
              }
              videoStart += videoTag.headerSize + videoTag.dataSize;
              if (videoStart > entryStart + entryTag.headerSize +
                entryTag.dataSize) {
                break;
              }
              videoTag = this.readBufferedTag_(videoStart, bytes);
            }
          } else if (entryTag.str === 'e1') {
            var audioStart = entryStart + entryTag.headerSize;
            var audioTag = this.readBufferedTag_(audioStart, bytes);
            while (audioTag) {
              if (audioTag.str === '9f') {
                track.numChannels = this.readUInt_(bytes,
                  audioStart + audioTag.headerSize, audioTag.dataSize);
              } else if (audioTag.str === 'b5') {
                track.samplingFrequency = this.readFloat_(bytes,
                  audioStart + audioTag.headerSize, audioTag.dataSize);
              } else if (audioTag.str === '6264') {
                track.bitDepth = this.readUInt_(bytes,
                  audioStart + audioTag.headerSize, audioTag.dataSize);
              }
              audioStart += audioTag.headerSize + audioTag.dataSize;
              if (audioStart > entryStart +
                entryTag.headerSize + entryTag.dataSize) {
                break;
              }
              audioTag = this.readBufferedTag_(audioStart, bytes);
            }
          }
          entryStart += entryTag.headerSize + entryTag.dataSize;
          if (entryStart > trackStart +
            trackTag.headerSize + trackTag.dataSize) {
            break;
          }
          entryTag = this.readBufferedTag_(entryStart, bytes);
        }

        this.tracks.push(track);
        trackStart += trackTag.headerSize + trackTag.dataSize;
        if (trackStart > this.tracksTag_.headerSize +
          this.tracksTag_.dataSize) {
          break;
        }
        trackTag = this.readBufferedTag_(trackStart, bytes);
      }

      console.log(this.tracks);
      this.width = -1;
      this.height = -1;
      this.numChannels = -1;
      this.samplingFrequency = -1;
      this.bitDepth = -1;

      var videotrack = this.getTrack_(1);
      if (videotrack) {
        this.width = videotrack.width;
        this.height = videotrack.height;
      }

      var audiotrack = this.getTrack_(2);
      if (audiotrack) {
        this.numChannels = audiotrack.numChannels;
        this.samplingFrequency = audiotrack.samplingFrequency;
        this.bitDepth = audiotrack.bitDepth;
      }
      this.createMimeType_();
      cb();
    }.bind(this));
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseCues_ = function (cb) {
    this.readTagBytes_(this.cuesTag_, function (bytes) {
      var cueStart = this.cuesTag_.headerSize;
      var cueTag = this.readBufferedTag_(cueStart, bytes);
      while (cueTag) {
        if (cueTag.str !== 'bb') {
          return;
        }

        /** @type {Cue} */
        var cue = {
          timecode: -1,
          track: -1,
          clusterOffset: -1
        };

        var cuePointStart = cueStart + cueTag.headerSize;
        var cuePointTag = this.readBufferedTag_(cuePointStart, bytes);
        while (cuePointTag) {
          if (cuePointTag.str === 'b3') {
            cue.timecode = this.readUInt_(bytes,
              cuePointStart + cuePointTag.headerSize, cuePointTag.dataSize);
          } else if (cuePointTag.str === 'b7') {
            var cueTrackPosStart = cuePointStart + cuePointTag.headerSize;
            var cueTrackPosTag = this.readBufferedTag_(cueTrackPosStart,
              bytes);
            while (cueTrackPosTag) {
              if (cueTrackPosTag.str === 'f7') {
                cue.track = this.readUInt_(bytes, cueTrackPosStart +
                  cueTrackPosTag.headerSize, cueTrackPosTag.dataSize);
              } else if (cueTrackPosTag.str === 'f1') {
                cue.clusterOffset = this.readUInt_(bytes, cueTrackPosStart +
                  cueTrackPosTag.headerSize, cueTrackPosTag.dataSize);
              }
              cueTrackPosStart += cueTrackPosTag.headerSize +
                cueTrackPosTag.dataSize;
              if (cueTrackPosStart > cuePointStart + cuePointTag.headerSize +
                cuePointTag.dataSize) {
                break;
              }
              cueTrackPosTag = this.readBufferedTag_(cueTrackPosStart, bytes);
            }
          }
          cuePointStart += cuePointTag.headerSize + cuePointTag.dataSize;
          if (cuePointStart > cueStart + cueTag.headerSize + cueTag.dataSize) {
            break;
          }
          cuePointTag = this.readBufferedTag_(cuePointStart, bytes);
        }

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

  /**
   *
   * @function
   * @param cb
   */
  WebM.prototype.getInitSegment = function (cb) {
    this.dataSource_.seek(0);
    this.readNextTag_(function (ebml) {
      if (!ebml || ebml.str !== '1a45dfa3') {
        cb(null);
        return;
      }
      this.dataSource_.read(ebml.dataSize);
      console.log('Found EBML:', ebml);
      this.readNextTag_(function processEBMLTag(tag) {
        if (!tag) {
          cb(null);
          return;
        }

        if (tag.str !== '18538067') {
          this.dataSource_.read(tag.dataSize);
          this.readNextTag_(processEBMLTag.bind(this));
          return;
        }

        console.log('Found Segment:', tag);
        this.readNextTag_(function processSegmentTag(tag) {
          if (!tag) {
            if (!this.clusterTag_) {
              console.err('No cluster tag found');
              cb(null);
            } else if (!this.infoTag_) {
              console.err('No info tag found');
              cb(null);
            } else if (!this.tracksTag_) {
              console.err('No tracks tag found');
              cb(null);
            } else if (!this.cuesTag_) {
              console.err('No cues tag found');
              cb(null);
              return;
            } else if (!this.seekHead_) {
              console.err('No seekhead tag found');
              cb(null);
              return;
            }

            this.parseInfos_(function () {
              this.parseTracks_(function () {
                this.parseCues_(function () {
                  ebml.dataSize = this.clusterTag_.headerOffset - ebml.headerSize;
                  this.readTagBytes_(ebml, function (bytes) {
                    cb(bytes);
                  }.bind(this));
                }.bind(this));
              }.bind(this));
            }.bind(this));
            return;
          }

          if (tag.str === '1f43b675' && !this.clusterTag_) {
            this.clusterTag_ = tag;
          } else if (tag.str === '1549a966' && !this.infoTag_) {
            this.infoTag_ = tag;
          } else if (tag.str === '1654ae6b' && !this.tracksTag_) {
            this.tracksTag_ = tag;
          } else if (tag.str === '1c53bb6b' && !this.cuesTag_) {
            this.cuesTag_ = tag;
          } else if (tag.str === '114d9b74' && !this.seekHeadTag_) {
            this.seekHead_ = tag.headerOffset;
          }

          this.dataSource_.read(tag.dataSize);
          this.readNextTag_(processSegmentTag.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  /**
   *
   * @param timecode
   * @param cb
   */
  WebM.prototype.getMediaSegment = function (timecode, cb) {
    for (var i = 0, l = this.cues.length; i < l; ++i) {
      /** @type {Cue} */
      var cue = this.cues[i];
      if (cue.timecode === timecode) {
        this.dataSource_.seek(this.seekHead_ + cue.clusterOffset);
        this.readNextTag_(function (tag) {
          this.readTagBytes_(tag, function (bytes) {
            cb(bytes);
          });
        }.bind(this));
        return;
      }
    }
    cb(null);
  };

  /**
   *
   * @private
   */
  WebM.prototype.createMimeType_ = function () {
    var isVideo = false;
    var codecs = [];
    var type = '';

    for (var i = 0, l = this.tracks.length; i < l; ++i) {
      var track = this.tracks[i];
      if (track.type === 1) {
        isVideo = true;
      }

      if (track.codec === 'V_VP8') {
        codecs.push('vp8');
      } else if (track.codec === 'V_VP9') {
        codecs.push('vp9');
      } else if (track.codec === 'A_VORBIS') {
        codecs.push('vorbis');
      } else if (track.codec === 'A_OPUS') {
        codecs.push('opus');
      }
    }

    if (isVideo) {
      type = 'video/webm';
    } else {
      type = 'audio/webm';
    }

    var mimeType = type + ';codecs="';
    for (var c = 0; c < codecs.length; ++c) {
      mimeType += codecs[c];
      if (c + 1 !== codecs.length) {
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
  WebM.prototype.readVariableInt_ = function (buffer, start, maxSize) {
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

  /**
   *
   * @param start
   * @param buffer
   * @returns {EBMLTag}
   * @private
   */
  WebM.prototype.readBufferedTag_ = function (start, buffer) {
    var result = this.readVariableInt_(buffer, start, 4);
    if (!result) {
      return null;
    }

    /** @type {EBMLTag} */
    var tag = {};

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
  WebM.prototype.readNextTag_ = function (cb) {
    var headerOffset = this.dataSource_.offset;

    this.dataSource_.fetchBytes(12, function (bytes) {
      if (!bytes) {
        cb(null);
        return;
      }

      var tag = this.readBufferedTag_(0, bytes);
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
  WebM.prototype.readFloat4_ = function (buf, start) {
    var val = 0;
    for (var i = 0; i < 4; ++i) {
      val <<= 8;
      val |= buf[start + i] & 0xff;
    }

    var sign = val >> 31;
    var exponent = ((val >> 23) & 0xff) - 127;
    var significand = val & 0x7fffff;
    if (exponent > -127) {
      if (exponent === 128) {
        if (significand === 0) {
          if (sign === 0) {
            return Number.POSITIVE_INFINITY;
          } else {
            return Number.NEGATIVE_INFINITY;
          }
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

    var num = Math.pow(-1, sign) * (significand * Math.pow(2, -23)) *
      Math.pow(2, exponent);

    return num;
  };

  /**
   *
   * @param buf
   * @param start
   * @returns {*}
   * @private
   */
  WebM.prototype.readFloat8_ = function (buf, start) {
    var sign = (buf[start] >> 7) & 0x1;
    var exponent = (((buf[start] & 0x7f) << 4) |
      ((buf[start + 1] >> 4) & 0xf)) - 1023;

    var significand = 0;
    var shift = Math.pow(2, 6 * 8);
    significand += (buf[start + 1] & 0xf) * shift;
    for (var i = 2; i < 8; ++i) {
      shift = Math.pow(2, (8 - i - 1) * 8);
      significand += (buf[start + i] & 0xff) * shift;
    }

    if (exponent > -1023) {
      if (exponent === 1024) {
        if (significand === 0) {
          if (sign === 0) {
            return Number.POSITIVE_INFINITY;
          } else {
            return Number.NEGATIVE_INFINITY;
          }
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

    var num = Math.pow(-1, sign) * (significand * Math.pow(2, -52)) *
      Math.pow(2, exponent);

    return num;
  };

  /**
   *
   * @param buf
   * @param start
   * @param size
   * @returns {*}
   * @private
   */
  WebM.prototype.readFloat_ = function (buf, start, size) {
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
  WebM.prototype.readUInt_ = function (buf, start, size) {
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

  /**
   *
   * @param buf
   * @param start
   * @param size
   * @returns {*}
   * @private
   */
  WebM.prototype.readString_ = function (buf, start, size) {
    if (size < 1 || size > 8) {
      return null;
    }

    var val = '';
    for (var i = 0; i < size; ++i) {
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
  WebM.prototype.readTagBytes_ = function (tag, cb) {
    this.dataSource_.seek(tag.headerOffset);
    this.dataSource_.fetchBytes(tag.headerSize + tag.dataSize, function (bytes) {
      if (!bytes) {
        cb(null);
        return;
      }

      this.dataSource_.read(tag.headerSize + tag.dataSize);
      cb(bytes);
    }.bind(this));
  };

  return WebM;
})();

Peeracle.Metadata = (function () {

  var Crypto = Peeracle.Crypto;

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
  Metadata.prototype.getId = function () {
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
  Metadata.prototype.calculateChunkSize = function (media) {
    /** @type {number} */
    var i;
    var l;
    var cues = media.cues;
    var sum = 0;
    var last = 0;

    for (i = 0, l = cues.length; i < l; ++i) {
      var cue = cues[i];
      sum += cue.clusterOffset - last;
      last = cue.clusterOffset;
    }

    var total = (sum / cues.length); // * cues.length;
    // var targetLength = 40 * 1024;
    // var chunkSize = total / (targetLength / 20);

    for (i = this.minChunkSize; i < this.maxChunkSize; i *= 2) {
      if (total > i) {
        continue;
      }
      break;
    }

    console.log(total);
    return i;
  };

  /**
   *
   * @param {Peeracle.Media} media
   * @param cb
   */
  Metadata.prototype.addStream = function (media, cb) {
    media.getInitSegment(function (bytes) {
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

      var numCues = media.cues.length;
      var currentCue = 0;

      if (!numCues) {
        this.streams.push(stream);
        cb();
        return;
      }

      var timecode = media.cues[currentCue].timecode;
      media.getMediaSegment(timecode, function nextMedia(bytes) {
        if (!bytes) {
          this.streams.push(stream);
          cb();
          return;
        }

        var clusterLength = bytes.length;
        var chunkLength = stream.chunksize;

        if (!this.crypto_) {
          this.crypto_ = Crypto.createInstance(this.cryptoId);
        }

        var cluster = {
          timecode: timecode,
          length: clusterLength,
          checksum: this.crypto_.checksum(bytes),
          chunks: []
        };

        for (var i = 0; i < clusterLength; i += chunkLength) {
          var chunk = bytes.subarray(i, i + chunkLength);

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
        media.getMediaSegment(timecode, nextMedia.bind(this));
      }.bind(this));
    }.bind(this));
  };

  return Metadata;
})();

Peeracle.Metadata.Serializer = (function () {

  var BinaryStream = Peeracle.BinaryStream;
  var Crypto = Peeracle.Crypto;

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
  MetadataSerializer.prototype.serializeSegment_ = function (segment) {
    this.stream_.writeUInt32(segment.timecode);
    this.stream_.writeUInt32(segment.length);
    this.crypto_.serialize(segment.checksum, this.stream_);
    this.stream_.writeUInt32(segment.chunks.length);
    for (var ci = 0, cl = segment.chunks.length; ci < cl; ++ci) {
      this.crypto_.serialize(segment.chunks[ci], this.stream_);
    }
  };

  /**
   *
   * @param {Stream} stream
   * @private
   */
  MetadataSerializer.prototype.serializeStream_ = function (stream) {
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
    for (var s = 0, sl = stream.segments.length; s < sl; ++s) {
      this.serializeSegment_(stream.segments[s]);
    }
  };

  /**
   *
   * @param {Metadata} metadata
   * @private
   */
  MetadataSerializer.prototype.serializeStreams_ = function (metadata) {
    var streams = metadata.streams;
    this.stream_.writeUInt32(streams.length);
    for (var i = 0; i < streams.length; ++i) {
      var stream = streams[i];
      this.serializeStream_(stream);
    }
  };

  /**
   *
   * @param {Metadata} metadata
   * @private
   */
  MetadataSerializer.prototype.serializeTrackers_ = function (metadata) {
    var trackers = metadata.trackers;

    this.stream_.writeUInt32(trackers.length);
    for (var t = 0; t < trackers.length; ++t) {
      this.stream_.writeString(trackers[t]);
    }
  };

  /**
   *
   * @param {Metadata} metadata
   * @private
   */
  MetadataSerializer.prototype.serializeHeader_ = function (metadata) {
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
  MetadataSerializer.prototype.allocate_ = function (metadata) {
    var length = 4 + 4 + (metadata.cryptoId.length + 1) + 4 + 8;

    var trackers = metadata.trackers;
    length += 4;
    for (var t = 0; t < trackers.length; ++t) {
      length += trackers[t].length + 1;
    }

    var streams = metadata.streams;
    length += 4;
    for (var s = 0; s < streams.length; ++s) {
      var stream = streams[s];

      length += 1 + (stream.mimeType.length + 1) + 4 + 4 + 4 + 4 + 4 + 4 +
          4 + stream.init.length;

      var segments = stream.segments;
      length += 4;

      for (var seg = 0; seg < segments.length; ++seg) {
        length += 4 + 4 + (4);

        var chunks = segments[seg].chunks;
        length += 4;
        for (var c = 0; c < chunks.length; ++c) {
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
  MetadataSerializer.prototype.serialize = function (metadata) {
    this.stream_ = new BinaryStream(this.allocate_(metadata));

    this.serializeHeader_(metadata);
    this.serializeTrackers_(metadata);
    this.serializeStreams_(metadata);

    return this.stream_.bytes;
  };

  return MetadataSerializer;
})();

Peeracle.Metadata.Unserializer = (function () {

  var Crypto = Peeracle.Crypto;

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
  MetadataUnserializer.prototype.unserializeSegment_ = function () {
    /** @type {Segment} */
    var segment = {};

    segment.timecode = this.stream_.readUInt32();
    segment.length = this.stream_.readUInt32();
    segment.checksum = this.crypto_.unserialize(this.stream_);

    segment.chunks = [];
    var numChunks = this.stream_.readUInt32();
    for (var ci = 0; ci < numChunks; ++ci) {
      var chunk = this.crypto_.unserialize(this.stream_);
      segment.chunks.push(chunk);
    }

    return segment;
  };

  /**
   *
   * @returns {Stream}
   * @private
   */
  MetadataUnserializer.prototype.unserializeStream_ = function () {
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

    /** @type {number} */
    var initLength = this.stream_.readUInt32();
    stream.init = new Uint8Array(initLength);
    for (var i = 0; i < initLength; ++i) {
      stream.init[i] = this.stream_.readByte();
    }

    stream.segments = [];
    var numSegments = this.stream_.readUInt32();
    for (var s = 0; s < numSegments; ++s) {
      /** @type Segment */
      var segment = this.unserializeSegment_();
      stream.segments.push(segment);
    }
    return stream;
  };

  /**
   *
   * @returns {Array.<Stream>}
   * @private
   */
  MetadataUnserializer.prototype.unserializeStreams_ = function () {
    /** @type Array.<Stream> */
    var streams = [];
    var numStreams = this.stream_.readUInt32();
    for (var i = 0; i < numStreams; ++i) {
      var stream = this.unserializeStream_();
      streams.push(stream);
    }
    return streams;
  };

  /**
   *
   * @returns {Array.<string>}
   * @private
   */
  MetadataUnserializer.prototype.unserializeTrackers_ = function () {
    var numTrackers = this.stream_.readUInt32();
    var trackers = [];

    for (var i = 0; i < numTrackers; ++i) {
      trackers.push(this.stream_.readString());
    }

    return trackers;
  };

  /**
   * @returns {Header}
   * @private
   */
  MetadataUnserializer.prototype.unserializeHeader_ = function () {
    /** @type {Header} */
    var header = {};

    header.magic = this.stream_.readUInt32();
    if (header.magic !== 1347568460) {
      throw 'Wrong file header';
    }

    header.version = this.stream_.readUInt32();
    header.cryptoId = this.stream_.readString();

    this.crypto_ = Crypto.createInstance(header.cryptoId);
    if (!this.crypto_) {
      throw 'Unknown checksum ' + header.cryptoId;
    }

    header.timecodeScale = this.stream_.readUInt32();
    header.duration = this.stream_.readFloat8();
    return header;
  };

  /**
   * @param {BinaryStream} stream
   * @param {Metadata} metadata
   */
  MetadataUnserializer.prototype.unserialize = function (stream, metadata) {
    this.stream_ = stream;

    /** @type {Header} */
    var header = this.unserializeHeader_();
    var trackers = this.unserializeTrackers_();
    var streams = this.unserializeStreams_();

    metadata.timecodeScale = header.timecodeScale;
    metadata.duration = header.duration;
    metadata.trackers = trackers;
    metadata.streams = streams;
  };

  return MetadataUnserializer;
})();

Peeracle.Peer = (function () {

  var Listenable = Peeracle.Listenable;

  /**
   * @class
   * @constructor
   * @memberof Peeracle
   */
  function Peer() {

  }

  Peer.prototype = Object.create(Listenable.prototype);

  return Peer;

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
})();

Peeracle.PeerConnection = (function () {

  var Listenable = Peeracle.Listenable;

  /**
   * @class
   * @constructor
   */
  function PeerConnection() {

  }

  PeerConnection.prototype = Object.create(Listenable.prototype);
  PeerConnection.prototype.constructor = PeerConnection;

  return PeerConnection;
})();

Peeracle.Tracker = (function () {

  var Tracker = {
  };

  return Tracker;
})();

Peeracle.Tracker.Client = (function () {

  var Listenable = Peeracle.Listenable;
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

  var onOpen_ = function () {
    console.log('[Peeracle.Tracker.Client] onOpen');
    this.ws_.send(new Uint8Array([0, 0]));
  };

  var onMessage_ = function (e) {
    var data = e.data;
    console.log('[Peeracle.Tracker.Client] onMessage', data);
  };

  var onError_ = function () {
    console.log('[Peeracle.Tracker.Client] onError');
  };

  var onClose_ = function (e) {
    var code = e.code;
    var reason = e.reason;
    console.log('[Peeracle.Tracker.Client] onClose', code, reason);
  };

  Client.prototype.connect = function (url) {
    this.url_ = url;

    this.ws_ = new WebSocket(this.url_, 'prcl-0.0.1', this.url_);
    this.ws_.onopen = onOpen_.bind(this);
    this.ws_.onmessage = onMessage_.bind(this);
    this.ws_.onerror = onError_.bind(this);
    this.ws_.onclose = onClose_.bind(this);
  };

  return Client;
})(this.Tracker);

Peeracle.Tracker.Message = (function () {

  var BinaryStream = Peeracle.BinaryStream;

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

  return Message;
})();

Peeracle.Utils = (function () {

  Math.trunc = Math.trunc || function (x) {
      return x < 0 ? Math.ceil(x) : Math.floor(x);
    };

  /**
   * @class
   * @constructor
   */
  function Utils() {
  }

  /**
   *
   * @param x
   * @returns {number}
   */
  Utils.trunc = function (x) {
    return Math.trunc(x);
  };

  return Utils;
})();
