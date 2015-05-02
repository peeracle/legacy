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

  var Crypto = Peeracle.Crypto || require('./crypto');

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

  global.MetadataUnserializer = MetadataUnserializer;
})(Peeracle || this);
