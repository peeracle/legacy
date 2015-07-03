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
var Peeracle = {};
Peeracle.Hash = require('./Hash');
// @endexclude

/**
 * @typedef {Object} Segment
 * @property {number} timecode - Segment's timecode
 * @property {number} length - Segment's length
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
 * @property {string} hashId
 * @property {number} timecodeScale
 * @property {number} duration
 */

/**
 * @class
 * @constructor
 * @memberof Peeracle
 */
Peeracle.Metadata = function Metadata() {
  /**
   * @member {?string}
   * @readonly
   */
  this.id = null;

  /**
   * @member {Peeracle.Hash}
   * @private
   */
  this.hash_ = null;

  /**
   * @member {string}
   */
  this.hashId = 'crc32';

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
};

/**
 * @function
 * @public
 * @return {number}
 */
Peeracle.Metadata.prototype.getId = function getId() {
  var stream;
  var streamIndex;
  var streamCount = this.streams.length;
  var segment;
  var segmentIndex;
  var segmentCount;
  var chunkIndex;
  var chunkCount;
  var checksum;

  if (this.id) {
    return this.id;
  }

  if (!this.hash_) {
    this.hash_ = Peeracle.Hash.createInstance(this.hashId);
  }

  this.hash_.init();
  for (streamIndex = 0; streamIndex < streamCount; ++streamIndex) {
    stream = this.streams[streamIndex];
    this.hash_.update(stream.init);
    segmentCount = stream.segments.length;
    for (segmentIndex = 0; segmentIndex < segmentCount; ++segmentIndex) {
      segment = stream.segments[segmentIndex];
      chunkCount = segment.chunks.length;
      for (chunkIndex = 0; chunkIndex < chunkCount; ++chunkIndex) {
        this.hash_.update(segment.chunks[chunkIndex]);
      }
    }
  }

  checksum = this.hash_.finish();
  this.id = this.hash_.toString(checksum);
  return this.id;
};

/**
 *
 * @param {Peeracle.Media} media
 * @returns {number}
 */
Peeracle.Metadata.prototype.calculateChunkSize =
  function calculateChunkSize(media) {
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

Peeracle.Metadata.prototype.addStreamNext_ =
  function addStreamNext_(stream, media, cb) {
    var i;
    var numCues = media.cues.length;
    var currentCue = 0;

    var timecode = media.cues[currentCue].timecode;
    media.getMediaSegment(timecode, function getMediaSegmentCb(bytes) {
      var clusterLength;
      var chunkLength;
      /** @type {Segment} */
      var cluster;
      var chunk;

      if (!bytes) {
        this.streams.push(stream);
        this.getId();
        cb();
        return;
      }

      clusterLength = bytes.length;
      chunkLength = stream.chunksize;

      if (!this.hash_) {
        this.hash_ = Peeracle.Hash.createInstance(this.hashId);
      }

      cluster = {
        timecode: timecode,
        length: clusterLength,
        chunks: []
      };

      for (i = 0; i < clusterLength; i += chunkLength) {
        chunk = bytes.subarray(i, i + chunkLength);

        cluster.chunks.push(this.hash_.checksum(chunk));
        if (clusterLength - i < chunkLength) {
          chunkLength = clusterLength - i;
        }
      }

      stream.segments.push(cluster);

      if (++currentCue >= numCues) {
        this.streams.push(stream);
        this.getId();
        cb();
        return;
      }

      timecode = media.cues[currentCue].timecode;
      media.getMediaSegment(timecode, getMediaSegmentCb.bind(this));
    }.bind(this));
  };

Peeracle.Metadata.prototype.addStreamFirst_ =
  function addStreamFirst_(media, bytes, cb) {
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
Peeracle.Metadata.prototype.addStream = function addStream(media, cb) {
  media.getInitSegment(function getInitSegmentCb(bytes) {
    this.addStreamFirst_(media, bytes, cb);
  }.bind(this));
};

Peeracle.Metadata.prototype.checkStreamNext_ =
  function checkStreamNext_(stream, media, cb) {
    var si = 0;
    var numCues = media.cues.length;
    var currentCue = 0;

    var got = [];
    var currentGot = 0;
    var gotIndex = 0;

    var timecode = media.cues[currentCue].timecode;
    media.getMediaSegment(timecode, function checkMediaSegmentCb(bytes) {
      var cluster;
      var checksum;
      var offset;
      var index = 0;
      var chunk;
      var valid = true;
      var chunkLength = stream.chunksize;

      if (!bytes) {
        cb(got);
        return;
      }

      if (!this.hash_) {
        this.hash_ = Peeracle.Hash.createInstance(this.hashId);
      }

      cluster = stream.segments[si++];

      for (offset = 0; offset < cluster.length; offset += chunkLength) {
        chunk = bytes.subarray(offset, offset + chunkLength);
        checksum = this.hash_.checksum(chunk);


        if (checksum !== cluster.chunks[index++]) {
          valid = false;
          break;
        }

        if (cluster.length - offset < chunkLength) {
          chunkLength = cluster.length - offset;
        }
      }

      if (valid) {
        currentGot += (1 << gotIndex);
      }

      if (++gotIndex === 32) {
        gotIndex = 0;
        got.push(currentGot);
        currentGot = 0;
      }

      if (++currentCue >= numCues) {
        if (gotIndex < 32) {
          got.push(currentGot);
        }
        cb(got);
        return;
      }

      timecode = media.cues[currentCue].timecode;
      media.getMediaSegment(timecode, checkMediaSegmentCb.bind(this));
    }.bind(this));
  };

Peeracle.Metadata.prototype.checkStreamFirst_ =
  function checkStreamFirst_(media, bytes, cb) {
    var si;
    var sl = this.streams.length;
    var stream;

    /** @type {Stream} */
    var currentStream = {
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

    if (this.timecodeScale !== -1 &&
      this.timecodeScale !== media.timecodeScale) {
      console.log('skipping C', this.timecodeScale, media.timecodeScale, media);
      cb([0]);
      return;
    }

    if (this.duration !== -1 &&
      this.duration !== media.duration) {
      console.log('skipping B', this.duration, media);
      cb([0]);
      return;
    }

    if (!media.cues.length) {
      console.log('skipping A');
      cb([0]);
      return;
    }

    for (si = 0; si < sl; ++si) {
      stream = this.streams[si];

      if (stream.type !== currentStream.type ||
        stream.mimeType !== currentStream.mimeType ||
        stream.bandwidth !== currentStream.bandwidth ||
        stream.width !== currentStream.width ||
        stream.height !== currentStream.height ||
        stream.numChannels !== currentStream.numChannels ||
        stream.samplingFrequency !== currentStream.samplingFrequency) {
        console.log('skipping');
        continue;
      }

      this.checkStreamNext_(stream, media, cb);
      return;
    }

    cb([0]);
  };

/**
 *
 * @param {Peeracle.Media} media
 * @param cb
 */
Peeracle.Metadata.prototype.checkStream = function checkStream(media, cb) {
  if (!media) {
    cb([0]);
    return;
  }

  media.getInitSegment(function getInitSegmentCb(bytes) {
    this.checkStreamFirst_(media, bytes, cb);
  }.bind(this));
};

// @exclude
module.exports = Peeracle.Metadata;
// @endexclude
