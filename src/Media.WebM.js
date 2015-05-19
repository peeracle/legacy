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
 * @typedef {Object} EBMLTag
 * @property {number} id
 * @property {string} str
 * @property {number} headerOffset
 * @property {number} headerSize
 * @property {number} dataSize
 */

// @exclude
/** @type {Media} **/
var Media = require('./Media');
// @endexclude

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
  this.readTagBytes_(this.infoTag_, function parseInfosReadTagBytesCb(bytes) {
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

WebM.prototype.parseCueTrack_ = function parseCueTrack_(cue, start, tag, bytes) {
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
              this.clusterTag_.headerOffset - this.ebmlTag_.headerSize;
            cb(null);
          }.bind(this));
        }.bind(this));
      }.bind(this));
      return;
    }

    if (tagMap.hasOwnProperty(tag.str) && !this[tagMap[tag.str] + WebM.TAG_SUFFIX_]) {
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
WebM.prototype.readVariableInt_ = function readVariableInt_(buffer, start, maxSize) {
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
  this.dataSource_.fetchBytes(tag.headerSize + tag.dataSize, function fetchBytesCb(bytes) {
    if (!bytes) {
      cb(null);
      return;
    }

    this.dataSource_.read(tag.headerSize + tag.dataSize);
    cb(bytes);
  }.bind(this));
};

module.exports = WebM;
