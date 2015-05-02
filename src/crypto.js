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

(function () {
  'use strict';

  /**
   * @interface
   * @memberof Peeracle
   * @namespace
   */
  function Crypto() {
  }

  /**
   *
   * @param id
   * @returns {?Crypto}
   */
  Crypto.createInstance = function (id) {
    for (var c in Crypto) {
      if (Crypto.hasOwnProperty(c) &&
        Crypto[c].hasOwnProperty('getIdentifier') &&
        Crypto[c].getIdentifier() === id) {
        return new Crypto[c]();
      }
    }
    return null;
  };

  /**
   * @function
   * @param array
   */
  Crypto.prototype.checksum = function (array) {
  };

  /**
   * @function
   */
  Crypto.prototype.init = function () {
  };

  /**
   * @function
   * @param array
   */
  Crypto.prototype.update = function (array) {
  };

  /**
   * @function
   */
  Crypto.prototype.finish = function () {
  };

  /**
   *
   * @param value
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.serialize = function (value, binaryStream) {
  };

  /**
   *
   * @param {BinaryStream} binaryStream
   */
  Crypto.prototype.unserialize = function (binaryStream) {
  };

  module.exports = Crypto;
})();
