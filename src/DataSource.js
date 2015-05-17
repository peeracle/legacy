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
/* eslint-disable */

/* istanbul ignore next */
/**
 * @interface
 * @memberof Peeracle
 * @param {*} handle
 * @constructor
 */
function DataSource(handle) {
  /**
   * @readonly
   * @member {number}
   */
  this.offset = 0;

  /**
   * @readonly
   * @member {number}
   */
  this.length = 0;
}

/* istanbul ignore next */
/**
 * @function
 * @param length
 */
DataSource.prototype.read = function read(length) {
};

/* istanbul ignore next */
/**
 * @function
 * @param position
 */
DataSource.prototype.seek = function seek(position) {
};

/* istanbul ignore next */
/**
 * @function
 * @param length
 * @param cb
 */
DataSource.prototype.fetchBytes = function fetchBytes(length, cb) {
};

/* eslint-enable */

module.exports = DataSource;
