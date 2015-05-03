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

module.exports = (function () {
  'use strict';

  /**
   * @typedef {Object} EBMLTag
   * @property {number} id
   * @property {string} str
   * @property {number} headerOffset
   * @property {number} headerSize
   * @property {number} dataSize
   */

  /** @type {Media} **/
  var Media = require('./Media');

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
