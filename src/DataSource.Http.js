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

// @exclude
/** @type {DataSource} */
var DataSource = require('./DataSource');
var XMLHttpRequest = require('xhr2');
// @endexclude

/**
 * @class
 * @memberof Peeracle.DataSource
 * @implements {Peeracle.DataSource}
 * @param {string} handle
 * @constructor
 */
function Http(handle) {
  if (typeof handle !== 'string') {
    throw new TypeError('Argument must be a string');
  }

  /**
   * @member {number}
   * @readonly
   */
  this.offset = 0;

  /**
   * @member {number}
   * @readonly
   */
  this.length = 0;

  /**
   * @member {string}
   * @readonly
   * @private
   */
  this.url_ = handle;
}

Http.prototype = Object.create(DataSource.prototype);
Http.prototype.constructor = Http;

/**
 * @function
 * @param length
 */
Http.prototype.read = function read(length) {
  if (typeof length !== 'number') {
    throw new TypeError('Invalid argument, expected number');
  }
  if (length < 0) {
    throw new RangeError('Value out of bounds');
  }
  this.offset += length;
};

/**
 * @function
 * @param position
 */
Http.prototype.seek = function seek(position) {
  if (typeof position !== 'number') {
    throw new TypeError('Invalid argument, expected number');
  }
  if (position < 0) {
    throw new RangeError('Value out of bounds');
  }
  this.offset = position;
};

/**
 * @function
 * @param length
 * @param cb
 */
Http.prototype.fetchBytes = function fetchBytes(length, cb) {
  /** @type {XMLHttpRequest} */
  var r;
  /** @type {Uint8Array} */
  var bytes;
  /** @type {string} */
  var range;

  if (typeof length !== 'number') {
    throw new TypeError('first argument must be a number');
  }

  if (typeof cb !== 'function') {
    throw new TypeError('second argument must be a callback');
  }

  range = this.offset + '-' + (this.offset + (length - 1));
  r = new XMLHttpRequest();
  r.open('GET', this.url_);
  r.setRequestHeader('Range', 'bytes=' + range);
  r.responseType = 'arraybuffer';
  r.onreadystatechange = function onreadystatechange() {
  };
  r.onload = function onload() {
    if (r.status === 206) {
      bytes = new Uint8Array(r.response);
      cb(bytes);
      return;
    }
    cb(null);
  };
  r.send();
};

module.exports = Http;
