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
var DataSource = require('./DataSource');
var fs = require('fs');
// @endexclude

/**
 * @class
 * @memberof Peeracle.DataSource
 * @implements {Peeracle.DataSource}
 * @param {Blob|string} handle
 * @constructor
 */
function File(handle) {
  // @exclude
  var stats;
  // @endexclude

  /**
   * @type {*}
   * @private
   */
  this.handle_ = handle;

  /**
   * @readonly
   * @member {number}
   */
  this.offset = 0;

  /**
   * @readonly
   * @member {number}
   */
  this.length = (typeof handle !== 'string') ? handle.size : -1;

  // @exclude
  stats = fs.statSync(this.handle_);
  this.length = stats.size;
  this.handle_ = fs.openSync(this.handle_, 'r');
  // @endexclude
}

File.prototype = Object.create(DataSource.prototype);
File.prototype.constructor = File;

/**
 *
 * @param length
 */
File.prototype.read = function read(length) {
  this.offset += length;
};

/**
 *
 * @param position
 */
File.prototype.seek = function seek(position) {
  this.offset = position;
};

// @exclude
/**
 *
 * @param length
 * @param cb
 * @private
 */
File.prototype.nodeFetchBytes_ = function nodeFetchBytes_(length, cb) {
  var bytes = new Buffer(length);
  var count = 0;

  fs.read(this.handle_, bytes, count, length, this.offset,
    function doRead(err, bytesRead) {
      if (err) {
        throw err;
      }

      count += bytesRead;
      if (count >= length) {
        cb(new Uint8Array(bytes));
        return;
      }
      fs.read(this.handle_, bytes, count, length, this.offset + count, doRead);
    }
  );
};
// @endexclude

/**
 *
 * @param length
 * @param cb
 */
File.prototype.fetchBytes = function fetchBytes(length, cb) {
  var reader;

  if (this.length > -1 && this.offset + length > this.length) {
    cb(null);
    return;
  }

  // @exclude
  if (typeof module === 'undefined') {
    // @endexclude
    reader = new FileReader();
    reader.onload = function onload(e) {
      cb(new Uint8Array(e.target.result));
    };
    reader.readAsArrayBuffer(this.handle_.slice(this.offset, this.offset + length));
    // @exclude
  } else {
    this.nodeFetchBytes_(length, cb);
  }
  // @endexclude
};

module.exports = File;
