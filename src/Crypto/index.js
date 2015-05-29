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
var Peeracle = require('../Peeracle');
// @endexclude

/* istanbul ignore next */
/**
 * @interface
 * @memberof Peeracle
 * @namespace
 */
function Crypto() {
}

/* istanbul ignore next */
Crypto.ERR_INVALID_ARGUMENT = 'Invalid argument';

/**
 *
 * @param id
 * @returns {?Crypto}
 */
Crypto.createInstance = function createInstance(id) {
  var c;

  if (typeof id !== 'string') {
    throw new TypeError(Crypto.ERR_INVALID_ARGUMENT);
  }

  for (c in Crypto) {
    if (Crypto.hasOwnProperty(c) &&
      Crypto[c].hasOwnProperty('prototype') &&
      Crypto[c].prototype instanceof Crypto &&
      Crypto[c].hasOwnProperty('IDENTIFIER') &&
      Crypto[c].IDENTIFIER === id) {
      return new Crypto[c]();
    }
  }

  return null;
};

/* eslint-disable */

/* istanbul ignore next */
/**
 * @function
 * @param array
 */
Crypto.prototype.checksum = function checksum(array) {
};

/* istanbul ignore next */
/**
 * @function
 */
Crypto.prototype.init = function init() {
};

/* istanbul ignore next */
/**
 * @function
 * @param array
 */
Crypto.prototype.update = function update(array) {
};

/* istanbul ignore next */
/**
 * @function
 */
Crypto.prototype.finish = function finish() {
};

/* istanbul ignore next */
/**
 *
 * @param value
 * @param {BinaryStream} binaryStream
 */
Crypto.prototype.serialize = function serialize(value, binaryStream) {
};

/* istanbul ignore next */
/**
 *
 * @param {BinaryStream} binaryStream
 */
Crypto.prototype.unserialize = function unserialize(binaryStream) {
};

/* eslint-enable */
// @exclude
module.exports = Crypto;

Crypto.Crc32 = require('./Crc32');
// @endexclude

Peeracle.Crypto = Crypto;
