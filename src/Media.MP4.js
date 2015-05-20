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

/**
 * @typedef {Object} MP4Atom
 * @property {string} type
 * @property {number} size
 * @property {number} offset
 */

// @exclude
/** @type {Utils} **/
var Utils = require('./Utils');
/** @type {Media} **/
var Media = require('./Media');
/** @type {BinaryStream} **/
var BinaryStream = require('./BinaryStream');
// @endexclude

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

MP4.prototype.parseAudioDescriptor_ = function parseAudioDescriptor_(bstream) {
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
  console.log(this.track_);

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
MP4.prototype.parseSampleDescription_ = function parseSampleDescription_(bstream) {
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
    console.log(this.cues);

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
    console.log('get Next Atom', atom);

    if (!atom) {
      cb(false);
      return;
    }

    if (this.moovAtom_ &&
      atom.offset === this.moovAtom_.offset + this.moovAtom_.size) {
      cb(true);
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
  this.dataSource_.seek(this.ftypAtom_.offset);
  this.dataSource_.fetchBytes(this.moovAtom_.offset +
    this.moovAtom_.size, function fetchCb(bytes) {
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
    console.log(timecode, bytes.length, 'bytes');
    cb(bytes);
  });
};

module.exports = MP4;
