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

(function (global) {
  'use strict';

  var BinaryStream = Peeracle.BinaryStream || require('./binarystream');
  var Crypto = Peeracle.Crypto || require('./crypto');

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

  global.MetadataSerializer = MetadataSerializer;
})(Peeracle || this);
