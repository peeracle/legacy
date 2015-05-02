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

(function (global) {
  'use strict';

  /** @type {DataSource} */
  var DataSource = Peeracle.DataSource || require('./datasource');
  // @exclude
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
  Http.prototype.read = function (length) {
    this.offset += length;
  };

  /**
   * @function
   * @param position
   */
  Http.prototype.seek = function (position) {
    this.offset = position;
  };

  /**
   * @function
   * @param length
   * @param cb
   */
  Http.prototype.fetchBytes = function (length, cb) {
    /** @type {XMLHttpRequest} */
    var r = new XMLHttpRequest();
    var range = this.offset + '-' + (this.offset + (length - 1));

    r.open('GET', this.url_);
    r.setRequestHeader('Range', 'bytes=' + range);
    r.responseType = 'arraybuffer';
    r.onload = function () {
      if (r.status === 206) {
        var bytes = new Uint8Array(r.response);
        cb(bytes);
        return;
      }
      cb(null);
    };
    r.send();
  };

  global.Http = Http;
})(Peeracle.DataSource || this.DataSource);
