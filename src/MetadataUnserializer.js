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
 * @class
 * @memberof Peeracle
 * @constructor
 */
Peeracle.MetadataUnserializer = function MetadataUnserializer() {
  /**
   * @type {Peeracle.Hash}
   * @private
   */
  this.hash_ = null;

  /**
   * @type {Peeracle.DataStream.Memory}
   * @private
   */
  this.stream_ = null;
};

/**
 *
 * @returns {Segment}
 * @private
 */
Peeracle.MetadataUnserializer.prototype.unserializeSegment_ =
  function unserializeSegment_() {
    /** @type {Segment} */
    var segment = {};
    var numChunks;
    var i;
    var chunk;

    segment.timecode = this.stream_.readUInt32();
    segment.length = this.stream_.readUInt32();
    // segment.checksum = this.hash_.unserialize(this.stream_);

    segment.chunks = [];
    numChunks = this.stream_.readUInt32();
    for (i = 0; i < numChunks; ++i) {
      chunk = this.hash_.unserialize(this.stream_);
      segment.chunks.push(chunk);
    }

    return segment;
  };

Peeracle.MetadataUnserializer.prototype.unserializeStreamInit_ =
  function unserializeStreamInit_(stream) {
    /** @type {number} */
    var i;
    var initLength = this.stream_.readUInt32();
    stream.init = new Uint8Array(initLength);
    for (i = 0; i < initLength; ++i) {
      stream.init[i] = this.stream_.readByte();
    }
  };

Peeracle.MetadataUnserializer.prototype.unserializeStreamSegments_ =
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
Peeracle.MetadataUnserializer.prototype.unserializeStream_ =
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
Peeracle.MetadataUnserializer.prototype.unserializeStreams_ =
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
Peeracle.MetadataUnserializer.prototype.unserializeTrackers_ =
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
Peeracle.MetadataUnserializer.prototype.unserializeHeader_ =
  function unserializeHeader_() {
    /** @type {Header} */
    var header = {};

    header.magic = this.stream_.readUInt32();
    if (header.magic !== 1347568460) {
      throw new Error('Wrong file header');
    }

    header.version = this.stream_.readUInt32();
    header.hashId = this.stream_.readString();

    this.hash_ = Peeracle.Hash.createInstance(header.hashId);
    if (!this.hash_) {
      throw new Error('Unknown checksum ' + header.hashId);
    }

    header.timecodeScale = this.stream_.readUInt32();
    header.duration = this.stream_.readFloat8();
    return header;
  };

/**
 * @param {Peeracle.DataStream} stream
 * @param {Peeracle.Metadata} metadata
 */
Peeracle.MetadataUnserializer.prototype.unserialize =
  function unserialize(stream, metadata) {
    var header;
    var trackers;
    var streams;

    this.stream_ = stream;

    header = this.unserializeHeader_();
    trackers = this.unserializeTrackers_();
    streams = this.unserializeStreams_();

    metadata.id = null;
    metadata.timecodeScale = header.timecodeScale;
    metadata.duration = header.duration;
    metadata.trackers = trackers;
    metadata.streams = streams;
    metadata.getId();
  };

// @exclude
module.exports = Peeracle.MetadataUnserializer;
// @endexclude
