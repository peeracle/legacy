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
var BinaryStream = require('./BinaryStream');
// @endexclude

/**
 * @class
 * @param {Uint8Array?} bytes
 * @constructor
 */
function Message(bytes) {
  /**
   * @member {Message.Type}
   */
  this.type = Message.Type.None;

  /**
   * @member {?BinaryStream}
   * @private
   */
  this.stream_ = null;

  if (bytes && typeof bytes === ArrayBuffer) {
    this.stream_ = new BinaryStream(bytes);
    // this.readFromBytes_(bytes);
  }
}

/**
 * @enum {number}
 */
Message.Type = {
  None: 0,
  Hello: 1,
  Welcome: 2
};

module.exports = Message;
