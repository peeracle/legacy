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
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
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

// @exclude
var Crypto = require('./Crypto');
// @endexclude

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

module.exports = Metadata;
