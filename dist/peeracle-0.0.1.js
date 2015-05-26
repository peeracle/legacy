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

  /**
   * Peeracle
   * @namespace Peeracle
   */
  function Peeracle() {}

  window['Peeracle'] = Peeracle;

  var RTCPeerConnection = window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.RTCPeerConnection;

  var RTCSessionDescription = window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.RTCSessionDescription;

  var RTCIceCandidate = window.mozRTCIceCandidate ||
    window.webkitRTCIceCandidate ||
    window.RTCIceCandidate;

  function bindMedia(media) {
    if (media.dataset && media.dataset.hasOwnProperty('peeracleIgnore')) {
      return;
    }

    media.pause();
    media.src = '';
  }

  function bindMedias() {
    var medias = document.querySelectorAll('audio, video');
    var i;
    var l = medias.length;

    for (i = 0; i < l; ++i) {
      var media = medias[i];
      if (media instanceof HTMLVideoElement) {
        bindMedia(media);
      }
    }
  }

  bindMedias();

  /**
   * @class
   * @memberof Peeracle
   * @param {!Uint8Array} buffer
   * @constructor
   */

  function BinaryStream(buffer) {
    if (!buffer || !(buffer instanceof Uint8Array)) {
      throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
    }

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
     */
    this.offset = 0;
  }

  BinaryStream.ERR_INVALID_ARGUMENT = 'Invalid argument';
  BinaryStream.ERR_INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
  BinaryStream.ERR_VALUE_OUT_OF_BOUNDS = 'Value out of bounds';

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readByte = function readByte() {
    if (this.offset + 1 >= this.length_) {
      throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    }
    return this.bytes[this.offset++];
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
    this.bytes.set(new Uint8Array([value]), this.offset++);
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

    if (length > this.length_ ||
      this.offset + length > this.length_) {
      throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    }

    bytes = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  };

  /**
   * @param {Uint8Array} bytes
   */
  BinaryStream.prototype.writeBytes = function writeBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    this.bytes.set(bytes, this.offset);
    this.offset += bytes.length;
  };

  /**
   * @returns {number}
   */
  BinaryStream.prototype.readFloat4 = function readFloat4() {
    var i;
    var val = 0;
    var sign;
    var exponent;
    var significand;
    var number = this.readBytes(4);

    for (i = 0; i < 4; ++i) {
      val <<= 8;
      val |= number[i] & 0xff;
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
      throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
    }

    f = new Float64Array([value]);
    u = new Uint8Array(f.buffer);

    this.writeBytes(u);
  };

  /**
   * @param {boolean?} unsigned
   * @returns {number}
   */
  BinaryStream.prototype.readInt16 = function readInt16(unsigned) {
    var number = this.readBytes(2);
    var value = (number[0] << 8);

    if (unsigned) {
      return value + number[1] >>> 0;
    }

    return value + number[1];
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
      throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
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
      throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
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
      throw new TypeError(BinaryStream.ERR_INVALID_ARGUMENT);
    }
    if (value < 0 || value >= this.length_) {
      throw new RangeError(BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    }
    this.offset = value;
  };

  Peeracle.BinaryStream = BinaryStream;

  /* istanbul ignore next */
  /**
   * @interface
   * @memberof Peeracle
   * @namespace
   */
  function Crypto() {}

  /* istanbul ignore next */
  Crypto.ERR_INVALID_ARGUMENT = 'Invalid argument';

  /**
   *
   * @param id
   * @returns {?Crypto}
   */
  Crypto.createInstance = function createInstance(id) {
    var c;

    if (typeof id !== 'string') {
      throw new TypeError(Crypto.ERR_INVALID_ARGUMENT);
    }

    for (c in Crypto) {
      if (Crypto.hasOwnProperty(c) &&
        Crypto[c].hasOwnProperty('prototype') &&
        Crypto[c].prototype instanceof Crypto &&
        Crypto[c].hasOwnProperty('IDENTIFIER') &&
        Crypto[c].IDENTIFIER === id) {
        return new Crypto[c]();
      }
    }

    return null;
  };

  /* eslint-disable */

  /* istanbul ignore next */
  /**
   * @function
   * @param array
   */
  Crypto.prototype.checksum = function checksum(array) {};

  /* istanbul ignore next */
  /**
   * @function
   */
  Crypto.prototype.init = function init() {};

  /* istanbul ignore next */
  /**
   * @function
   * @param array
   */
  Crypto.prototype.update = function update(array) {};

  /* istanbul ignore next */
  /**
   * @function
   */
  Crypto.prototype.finish = function finish() {};

  /* istanbul ignore next */
  /**
   *
   * @param value
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.serialize = function serialize(value, binaryStream) {};

  /* istanbul ignore next */
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
    var arr = array;

    if (typeof arr === 'string') {
      arr = Utils.stringToArray(arr);
    }

    this.init();
    this.update(arr);
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
    var arr = array;

    if (typeof arr === 'string') {
      arr = Utils.stringToArray(arr);
    }

    for (i = 0, l = arr.length; i < l; ++i) {
      this.crc_ = (this.crc_ >>> 8) ^
        this.crcTable_[(this.crc_ ^ arr[i]) & 0xFF];
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
    binaryStream.writeUInt32(value);
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

  /* istanbul ignore next */
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

  /* istanbul ignore next */
  /**
   * @function
   * @param length
   */
  DataSource.prototype.read = function read(length) {};

  /* istanbul ignore next */
  /**
   * @function
   * @param position
   */
  DataSource.prototype.seek = function seek(position) {};

  /* istanbul ignore next */
  /**
   * @function
   * @param length
   * @param cb
   */
  DataSource.prototype.fetchBytes = function fetchBytes(length, cb) {};

  /* eslint-enable */

  Peeracle.DataSource = DataSource;

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
  File.prototype.read = function read(length) {
    this.offset += length;
  };

  /**
   *
   * @param position
   */
  File.prototype.seek = function seek(position) {
    this.offset = position;
  };

  /**
   *
   * @param length
   * @param cb
   */
  File.prototype.fetchBytes = function fetchBytes(length, cb) {
    var reader;

    if (this.length > -1 && this.offset + length > this.length) {
      cb(null);
      return;
    }

    reader = new FileReader();
    reader.onload = function onload(e) {
      cb(new Uint8Array(e.target.result));
    };
    reader.readAsArrayBuffer(this.handle_.slice(this.offset, this.offset +
      length));
  };

  Peeracle.DataSource.File = File;

  /**
   * @class
   * @memberof Peeracle.DataSource
   * @implements {Peeracle.DataSource}
   * @param {string} handle
   * @constructor
   */
  function Http(handle) {
    if (typeof handle !== 'string') {
      throw new TypeError('first argument must be a string');
    }

    /**
     * @member {number}
     * @readonly
     */
    this.offset = 0;

    /**
     * @member {number}
     * @readonly
     */
    this.length = -1;

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
  Http.prototype.read = function read(length) {
    if (typeof length !== 'number') {
      throw new TypeError('Invalid argument, expected number');
    }
    if (length < 0) {
      throw new RangeError('Value out of bounds');
    }
    this.offset += length;
  };

  /**
   * @function
   * @param position
   */
  Http.prototype.seek = function seek(position) {
    if (typeof position !== 'number') {
      throw new TypeError('Invalid argument, expected number');
    }
    if (position < 0) {
      throw new RangeError('Value out of bounds');
    }
    this.offset = position;
  };

  Http.prototype.retrieveLength_ = function retrieveLength_(cb) {
    var r = new XMLHttpRequest();

    r.open('HEAD', this.url_);
    r.onreadystatechange = function onreadystatechange() {};
    r.onload = function onload() {
      var length;

      if (r.status >= 400) {
        cb(false);
        return;
      }

      length = r.getResponseHeader('Content-Length');
      if (length) {
        this.length = parseInt(length, 10);
      } else {
        this.length = -2;
      }
      cb(true);
    }.bind(this);
    r.send();
  };

  Http.prototype.doFetchBytes_ = function doFetchBytes_(length, cb) {
    /** @type {XMLHttpRequest} */
    var r = new XMLHttpRequest();
    /** @type {Uint8Array} */
    var bytes;
    /** @type {string} */
    var range = this.offset + '-' + (this.offset + (length - 1));

    r.open('GET', this.url_);
    r.setRequestHeader('Range', 'bytes=' + range);
    r.responseType = 'arraybuffer';
    r.onreadystatechange = function onreadystatechange() {};
    r.onload = function onload() {
      if (r.status === 206) {
        bytes = new Uint8Array(r.response);
        cb(bytes);
        return;
      }
      cb(null);
    };
    r.send();
  };

  /**
   * @function
   * @param length
   * @param cb
   */
  Http.prototype.fetchBytes = function fetchBytes(length, cb) {
    if (typeof length !== 'number') {
      throw new TypeError('first argument must be a number');
    }

    if (length < 1) {
      throw new RangeError('first argument must be greater than zero');
    }

    if (typeof cb !== 'function') {
      throw new TypeError('second argument must be a callback');
    }

    if (this.length === -1) {
      this.retrieveLength_(function retrieveLengthCb(result) {
        if (!result) {
          cb(null);
          return;
        }
        this.doFetchBytes_(length, cb);
      }.bind(this));
      return;
    }

    this.doFetchBytes_(length, cb);
  };

  Peeracle.DataSource.Http = Http;

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
   * @property {number} offset
   * @property {number} size
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
   * @typedef {Object} MP4Atom
   * @property {string} type
   * @property {number} size
   * @property {number} offset
   */

  /**
   * @class
   * @param {Peeracle.DataSource} dataSource
   * @constructor
   */
  function MP4(dataSource) {
    /**
     * @member {Peeracle.DataSource}
     * @private
     */
    this.dataSource_ = dataSource;

    /**
     * @member {Track}
     * @private
     */
    this.track_ = null;

    /**
     * @member {MP4Atom}
     * @private
     */
    this.ftypAtom_ = null;

    /**
     * @member {MP4Atom}
     * @private
     */
    this.moovAtom_ = null;

    /**
     * @member {string}
     * @private
     */
    this.majorBrand_ = null;

    /**
     * @member {number}
     * @private
     */
    this.version_ = null;

    /**
     * @member {Array.<string>}
     * @private
     */
    this.compatibleBrands_ = [];

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
  }

  MP4.prototype = Object.create(Media.prototype);
  MP4.prototype.constructor = MP4;

  /**
   *
   * @param {DataSource} dataSource
   * @param cb
   */
  MP4.checkHeader = function checkHeader(dataSource, cb) {
    dataSource.seek(0);
    dataSource.fetchBytes(8, function fetchBytesCb(bytes) {
      if (bytes && bytes.length === 8 &&
        bytes[4] === 'f'.charCodeAt(0) &&
        bytes[5] === 't'.charCodeAt(0) &&
        bytes[6] === 'y'.charCodeAt(0) &&
        bytes[7] === 'p'.charCodeAt(0)) {
        cb(new MP4(dataSource));
        return;
      }
      cb(null);
    });
  };

  /**
   * @param cb
   * @private
   */
  MP4.prototype.readNextAtom_ = function readNextAtom_(cb) {
    /**
     * @type {MP4Atom}
     */
    var atom = {
      type: '',
      size: -1,
      offset: -1
    };

    atom.offset = this.dataSource_.offset;
    this.dataSource_.fetchBytes(8, function fetchSize(bytes) {
      if (!bytes || bytes.length !== 8) {
        cb(null);
        return;
      }

      atom.size = ((bytes[0] << 24) +
        (bytes[1] << 16) +
        (bytes[2] << 8) +
        bytes[3]) >>> 0;

      atom.type = String.fromCharCode(bytes[4]) +
        String.fromCharCode(bytes[5]) +
        String.fromCharCode(bytes[6]) +
        String.fromCharCode(bytes[7]);

      this.dataSource_.read(atom.size);
      cb(atom);
    }.bind(this));
  };

  MP4.prototype.parseFtypCompatibleBrands_ =
    function parseFtypCompatibleBrands_(atom, cb) {
      var i = 16;
      this.dataSource_.fetchBytes(4, function getNextBrand(bytes) {
        var brandStr;

        if (!bytes) {
          cb(false);
          return;
        }

        brandStr = String.fromCharCode(bytes[0]) +
          String.fromCharCode(bytes[1]) +
          String.fromCharCode(bytes[2]) +
          String.fromCharCode(bytes[3]);

        i += 4;
        this.compatibleBrands_.push(brandStr);
        this.dataSource_.read(4);
        if (i < atom.size) {
          this.dataSource_.fetchBytes(4, getNextBrand.bind(this));
          return;
        }
        cb(true);
      }.bind(this));
    };

  MP4.prototype.parseFtypVersion_ = function parseFtypVersion_(atom, cb) {
    this.dataSource_.fetchBytes(4, function getVersion(bytes) {
      if (!bytes) {
        cb(false);
        return;
      }

      this.version_ = ((bytes[0] << 24) +
        (bytes[1] << 16) +
        (bytes[2] << 8) +
        bytes[3]) >>> 0;

      this.dataSource_.read(4);
      this.parseFtypCompatibleBrands_(atom, cb);
    }.bind(this));
  };

  MP4.prototype.parseFtypMajorBrand_ = function parseFtypMajorBrand_(atom, cb) {
    this.dataSource_.seek(atom.offset + 8);
    this.dataSource_.fetchBytes(4, function getMajorBrand(bytes) {
      if (!bytes) {
        cb(false);
        return;
      }
      this.majorBrand_ = String.fromCharCode(bytes[0]) +
        String.fromCharCode(bytes[1]) +
        String.fromCharCode(bytes[2]) +
        String.fromCharCode(bytes[3]);
      this.dataSource_.read(4);
      this.parseFtypVersion_(atom, cb);
    }.bind(this));
  };

  MP4.prototype.parseFtyp_ = function parseFtyp_(atom, cb) {
    this.ftypAtom_ = atom;
    this.parseFtypMajorBrand_(atom, cb);
  };

  MP4.prototype.parseMvhd_ = function parseMvhd_(atom, cb) {
    this.dataSource_.seek(atom.offset);
    this.dataSource_.fetchBytes(atom.size, function fetchCb(bytes) {
      var bstream;
      var version;

      if (!bytes) {
        cb(false);
        return;
      }

      bstream = new BinaryStream(bytes);
      bstream.seek(8);
      version = bstream.readByte();
      if (version) {
        cb(false);
        return;
      }

      bstream.seek(20);
      this.timecodeScale = bstream.readUInt32();
      this.duration = bstream.readUInt32();

      this.dataSource_.seek(atom.offset + atom.size);
      cb(true);
    }.bind(this));
  };

  MP4.prototype.parseTrak_ = function parseTrak_(atom, cb) {
    if (this.track_) {
      this.tracks.push(this.track_);
    }

    this.track_ = {
      id: -1,
      type: -1,
      codec: '',
      width: -1,
      height: -1,
      numChannels: -1,
      samplingFrequency: -1,
      bitDepth: -1
    };

    this.digAtom_(atom, cb);
  };

  MP4.prototype.parseTkhd_ = function parseTkhd_(atom, cb) {
    this.dataSource_.seek(atom.offset);
    this.dataSource_.fetchBytes(atom.size, function fetchCb(bytes) {
      var bstream;
      var version;

      if (!bytes) {
        cb(false);
        return;
      }

      bstream = new BinaryStream(bytes);
      bstream.seek(8);
      version = bstream.readByte();
      if (version) {
        cb(false);
        return;
      }

      bstream.seek(20);
      this.track_.id = bstream.readUInt32();
      this.dataSource_.seek(atom.offset + atom.size);
      cb(true);
    }.bind(this));
  };

  MP4.prototype.parseHdlr_ = function parseHdlr_(atom, cb) {
    this.dataSource_.seek(atom.offset);
    this.dataSource_.fetchBytes(atom.size, function fetchCb(bytes) {
      var bstream;
      var version;
      var type;

      if (!bytes) {
        cb(false);
        return;
      }

      bstream = new BinaryStream(bytes);
      bstream.seek(8);
      version = bstream.readByte();
      if (version) {
        cb(false);
        return;
      }

      bstream.seek(16);
      type = bstream.readString(4);
      if (type === 'vide') {
        this.track_.type = 1;
      } else if (type === 'soun') {
        this.track_.type = 2;
      }
      this.dataSource_.seek(atom.offset + atom.size);
      cb(true);
    }.bind(this));
  };

  MP4.prototype.parseMoov_ = function parseMoov_(atom, cb) {
    this.moovAtom_ = atom;
    this.dataSource_.seek(atom.offset + 8);
    cb(true);
  };

  MP4.prototype.digAtom_ = function digAtom_(atom, cb) {
    this.dataSource_.seek(atom.offset + 8);
    cb(true);
  };

  MP4.prototype.parseVideoDecoderConfig_ =
    function parseVideoDecoderConfig_(bstream) {
      var size;
      var type;
      var profile;
      var compat;
      var level;

      size = bstream.readUInt32();
      if (!size || size < 1) {
        return false;
      }

      type = bstream.readString(4);
      if (!type || type !== 'avcC') {
        return false;
      }

      bstream.readByte();
      profile = bstream.readByte();
      compat = bstream.readByte();
      level = bstream.readByte();

      this.track_.codec += '.' + Utils.decimalToHex(profile);
      this.track_.codec += Utils.decimalToHex(compat);
      this.track_.codec += Utils.decimalToHex(level);
      return true;
    };

  MP4.prototype.parseSampleVideo_ = function parseSampleVideo_(bstream) {
    bstream.seek(bstream.offset + 8);
    this.track_.width = bstream.readInt16();
    this.track_.height = bstream.readInt16();
    bstream.seek(bstream.offset + 46);
    this.track_.bitDepth = bstream.readInt16();

    this.width = this.track_.width;
    this.height = this.track_.height;
    this.bitDepth = this.track_.bitDepth;
    bstream.readInt16();

    return this.parseVideoDecoderConfig_(bstream);
  };

  MP4.prototype.parseAudioDescriptor_ = function parseAudioDescriptor_(
    bstream) {
    var size;
    var type;

    size = bstream.readUInt32();
    if (!size || size < 1) {
      return false;
    }

    type = bstream.readString(4);
    if (!type || type !== 'esds') {
      return false;
    }

    // TODO: parse audio descriptor to retrieve the real mp4a codec name
    return true;
  };

  MP4.prototype.parseSampleSound_ = function parseSampleSound_(bstream) {
    this.track_.numChannels = bstream.readInt16();
    bstream.seek(bstream.offset + 6);
    this.track_.samplingFrequency = bstream.readInt16();

    this.numChannels = this.track_.numChannels;
    this.samplingFrequency = this.track_.samplingFrequency;
    bstream.readInt16();

    return this.parseAudioDescriptor_(bstream);
  };

  /**
   * @param {BinaryStream} bstream
   * @returns {boolean}
   * @private
   */
  MP4.prototype.parseSampleDescription_ = function parseSampleDescription_(
    bstream) {
    /**
     * @type {string}
     */
    var type;

    bstream.readUInt32();
    type = bstream.readString(4);
    if (!type) {
      return false;
    }

    bstream.seek(40);
    this.track_.codec = type;
    if (type === 'avc1') {
      return this.parseSampleVideo_(bstream);
    } else if (type === 'mp4a') {
      return this.parseSampleSound_(bstream);
    }

    return false;
  };

  MP4.prototype.parseStsd_ = function parseStsd_(atom, cb) {
    this.dataSource_.seek(atom.offset);
    this.dataSource_.fetchBytes(atom.size, function fetchCb(bytes) {
      /**
       * @type {BinaryStream}
       */
      var bstream;

      /**
       * @type {number}
       */
      var version;

      /**
       * @type {number}
       */
      var count;

      /**
       * @type {number}
       */
      var i;

      if (!bytes) {
        cb(false);
        return;
      }

      bstream = new BinaryStream(bytes);
      bstream.seek(8);
      version = bstream.readByte();
      if (version) {
        cb(false);
        return;
      }

      bstream.seek(12);
      count = bstream.readUInt32();
      for (i = 0; i < count; ++i) {
        this.parseSampleDescription_(bstream);
      }

      console.log(this.track_);
      this.dataSource_.seek(atom.offset + atom.size);
      cb(true);
    }.bind(this));
  };
  MP4.prototype.parseSidx_ = function parseStsd_(atom, cb) {
    this.dataSource_.seek(atom.offset);
    this.dataSource_.fetchBytes(atom.size, function fetchCb(bytes) {
      var bstream;
      var version;
      var time;
      var offset;
      var count;
      var i;
      var duration;
      /** @type {Cue} */
      var cue;

      if (!bytes) {
        cb(false);
        return;
      }

      bstream = new BinaryStream(bytes);
      bstream.seek(8);
      version = bstream.readByte();
      if (version) {
        cb(false);
        return;
      }

      bstream.seek(20);
      time = bstream.readUInt32();
      offset = bstream.readUInt32() + atom.offset + atom.size;
      bstream.seek(30);

      count = bstream.readInt16();
      for (i = 0; i < count; ++i) {
        cue = {
          timecode: -1,
          track: -1,
          offset: -1,
          size: -1
        };
        cue.size = bstream.readUInt32() & 0x8FFFFFFF;
        duration = bstream.readUInt32();
        bstream.readUInt32();
        cue.timecode = time;
        cue.track = -1;
        cue.offset = offset;
        this.cues.push(cue);
        offset += cue.size;
        time += duration;
      }

      this.dataSource_.seek(atom.offset + atom.size);
      cb(true);
    }.bind(this));
  };

  /**
   * @param cb
   * @private
   */
  MP4.prototype.parse_ = function parse_(cb) {
    this.readNextAtom_(function readNextAtomCb(atom) {
      var atomMap = {
        'ftyp': this.parseFtyp_,
        'moov': this.parseMoov_,
        'mvhd': this.parseMvhd_,
        'trak': this.parseTrak_,
        'tkhd': this.parseTkhd_,
        'mdia': this.digAtom_,
        'hdlr': this.parseHdlr_,
        'minf': this.digAtom_,
        'stbl': this.digAtom_,
        'stsd': this.parseStsd_,
        'sidx': this.parseSidx_
      };

      // TODO: check if we've got everything required by the MediaSource API
      if (!atom) {
        cb(this.ftypAtom_ && this.moovAtom_);
        return;
      }

      if (!atomMap.hasOwnProperty(atom.type)) {
        this.readNextAtom_(readNextAtomCb.bind(this));
        return;
      }

      atomMap[atom.type].call(this, atom, function parseCb_(result) {
        if (!result) {
          cb(false);
          return;
        }
        this.readNextAtom_(readNextAtomCb.bind(this));
      }.bind(this));
    }.bind(this));
  };

  /**
   *
   * @function
   * @param cb
   */
  MP4.prototype.getInitSegment = function getInitSegment(cb) {
    if (!this.ftypAtom_ && !this.moovAtom_) {
      this.parse_(function parseCb(result) {
        if (!result) {
          cb(null);
          return;
        }
        this.getInitSegment(cb);
      }.bind(this));
      return;
    }
    console.log(this);
    this.dataSource_.seek(this.ftypAtom_.offset);
    this.dataSource_.fetchBytes(this.moovAtom_.offset +
      this.moovAtom_.size,
      function fetchCb(bytes) {
        cb(bytes);
      });
  };

  /**
   *
   * @function
   * @param timecode
   * @param cb
   */
  MP4.prototype.getMediaSegment = function getMediaSegment(timecode, cb) {
    var i;
    var cue;
    var l = this.cues.length;

    for (i = 0; i < l; ++i) {
      cue = this.cues[i];
      if (timecode <= cue.timecode) {
        break;
      }
    }

    if (i >= l) {
      cb(null);
      return;
    }

    this.dataSource_.seek(cue.offset);
    this.dataSource_.fetchBytes(cue.size, function fetchMediaCb(bytes) {
      cb(bytes);
    });
  };

  Peeracle.Media.MP4 = MP4;

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
            tagMap[videoTag.str][1].call(this, bytes, videoStart + videoTag.headerSize,
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
            tagMap[audioTag.str][1].call(this, bytes, audioStart + audioTag.headerSize,
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
      '86': ['codec', this.readString_]
    };

    while (entryTag) {
      if (tagMap.hasOwnProperty(entryTag.str)) {
        track[tagMap[entryTag.str][0]] =
          tagMap[entryTag.str][1].call(this, bytes, entryStart + entryTag.headerSize,
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
    var cueTrackStart = start;
    var cueTrackTag = this.readBufferedTag_(cueTrackStart, bytes);

    var tagMap = {
      'f7': ['track', this.readUInt_],
      'f1': ['offset', this.readUInt_]
    };

    while (cueTrackTag) {
      if (tagMap.hasOwnProperty(cueTrackTag.str)) {
        cue[tagMap[cueTrackTag.str][0]] =
          tagMap[cueTrackTag.str][1].call(this, bytes,
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
      offset: -1,
      size: -1
    };

    var cuePointStart = start + tag.headerSize;
    var cuePointTag = this.readBufferedTag_(cuePointStart, bytes);

    while (cuePointTag) {
      if (cuePointTag.str === 'b3') {
        cue.timecode = this.readUInt_(bytes,
          cuePointStart + cuePointTag.headerSize, cuePointTag.dataSize);
      } else if (cuePointTag.str === 'b7') {
        this.parseCueTrack_(cue, cuePointStart + cuePointTag.headerSize,
          cuePointTag, bytes);
      }
      cuePointStart += cuePointTag.headerSize + cuePointTag.dataSize;
      if (cuePointStart > start + tag.headerSize + tag.dataSize) {
        break;
      }
      cuePointTag = this.readBufferedTag_(cuePointStart, bytes);
    }
    this.cues.push(cue);
  };

  /**
   *
   * @param cb
   * @private
   */
  WebM.prototype.parseCues_ = function parseCues_(cb) {
    this.readTagBytes_(this.cuesTag_, function readBytesCb(bytes) {
      var cueStart = this.cuesTag_.headerSize;
      var cueTag = this.readBufferedTag_(cueStart, bytes);

      while (cueTag) {
        if (cueTag.str !== 'bb') {
          return;
        }

        this.parseCue_(cueStart, cueTag, bytes);
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
              cb(null);
            }.bind(this));
          }.bind(this));
        }.bind(this));
        return;
      }

      if (tagMap.hasOwnProperty(tag.str) && !this[tagMap[tag.str] +
          WebM.TAG_SUFFIX_]) {
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
    if (!this.ebmlTag_) {
      this.parse_(function parseCb(err) {
        if (err) {
          throw err;
        }
        this.getInitSegment(cb);
      }.bind(this));
      return;
    }

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

    this.dataSource_.seek(this.seekHeadTag_.headerOffset + cue.offset);
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
      sum += cue.offset - last;
      last = cue.offset;
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

  function Storage() {}

  Peeracle.Storage = Storage;

  function File() {}

  File.prototype = Object.create(Storage.prototype);
  File.prototype.constructor = File;

  function Memory() {}

  Memory.prototype = Object.create(Storage.prototype);
  Memory.prototype.constructor = Memory;

  function PouchDB() {}

  PouchDB.prototype = Object.create(Storage.prototype);
  PouchDB.prototype.constructor = PouchDB;

  function Tracker() {}

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

  Utils.stringToArray = function stringToArray(str) {
    var i;
    var l = str.length;
    var arr = [];

    for (i = 0; i < l; ++i) {
      arr.push(str.charCodeAt(i));
    }

    return arr;
  };

  /**
   *
   * @param {number} d
   * @param {number} padding
   * @returns {string}
   */
  Utils.decimalToHex = function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    var pad = padding;

    pad = typeof(pad) === 'undefined' || pad === null ? pad = 2 : pad;
    while (hex.length < pad) {
      hex = '0' + hex;
    }
    return hex;
  };

  Peeracle.Utils = Utils;
})();
