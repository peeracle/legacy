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
Peeracle.DataStream = require('./DataStream');
Peeracle.Hash = require('./Hash');
// @endexclude

/**
 * @class
 * @memberof Peeracle
 * @constructor
 */
Peeracle.MetadataSerializer = function MetadataSerializer() {
  /**
   * @type {Peeracle.Hash}
   * @private
   */
  this.hash_ = null;

  /**
   * @type {Peeracle.DataStream}
   * @private
   */
  this.stream_ = null;
};

/**
 *
 * @param segment
 * @private
 */
Peeracle.MetadataSerializer.prototype.serializeSegment_ =
  function serializeSegment_(segment) {
    var ci;
    var cl;

    this.stream_.writeUInt32(segment.timecode);
    this.stream_.writeUInt32(segment.length);
    // this.hash_.serialize(segment.checksum, this.stream_);
    this.stream_.writeUInt32(segment.chunks.length);

    for (ci = 0, cl = segment.chunks.length; ci < cl; ++ci) {
      this.hash_.serialize(segment.chunks[ci], this.stream_);
    }
  };

/**
 *
 * @param {Stream} stream
 * @private
 */
Peeracle.MetadataSerializer.prototype.serializeStream_ =
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
 * @param {Peeracle.Metadata} metadata
 * @private
 */
Peeracle.MetadataSerializer.prototype.serializeStreams_ =
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
 * @param {Peeracle.Metadata} metadata
 * @private
 */
Peeracle.MetadataSerializer.prototype.serializeTrackers_ =
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
 * @param {Peeracle.Metadata} metadata
 * @private
 */
Peeracle.MetadataSerializer.prototype.serializeHeader_ =
  function serializeHeader_(metadata) {
    this.hash_ = Peeracle.Hash.createInstance(metadata.hashId);
    if (!this.hash_) {
      throw 'Unknown checksum ' + metadata.hashId;
    }

    this.stream_.writeUInt32(1347568460);
    this.stream_.writeUInt32(2);
    this.stream_.writeString(metadata.hashId);
    this.stream_.writeUInt32(metadata.timecodeScale);
    this.stream_.writeFloat8(metadata.duration);
  };

/**
 * @param {Peeracle.Metadata} metadata
 * @returns {Uint8Array}
 * @private
 */
Peeracle.MetadataSerializer.prototype.allocate_ = function allocate_(metadata) {
  // TODO: Fix this into something better
  var i;
  var seg;
  var ch;
  var chunks;
  var stream;
  var streams;
  var segments;
  var length = 4 + 4 + (metadata.hashId.length + 1) + 4 + 8;

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
      length += 4 + (4);

      chunks = segments[seg].chunks;
      length += 4;
      for (ch = 0; ch < chunks.length; ++ch) {
        length += 16;
      }
    }
  }

  return new Uint8Array(length);
};

/**
 *
 * @param {Peeracle.Metadata} metadata
 * @returns {Uint8Array}
 */
Peeracle.MetadataSerializer.prototype.serialize = function serialize(metadata) {
  this.stream_ = new Peeracle.DataStream.Memory(this.allocate_(metadata));

  this.serializeHeader_(metadata);
  this.serializeTrackers_(metadata);
  this.serializeStreams_(metadata);

  return this.stream_.bytes;
};

// @exclude
module.exports = Peeracle.MetadataSerializer;
// @endexclude
