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
 * @property {number} clusterOffset
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
Media.prototype.getInitSegment = function getInitSegment(cb) {
};

/**
 *
 * @function
 * @param timecode
 * @param cb
 */
Media.prototype.getMediaSegment = function getMediaSegment(timecode, cb) {
};

/* eslint-enable */

module.exports = Media;
