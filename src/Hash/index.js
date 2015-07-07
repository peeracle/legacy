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
Peeracle.Hash = function Crypto() {
};

/* istanbul ignore next */
Peeracle.Hash.ERR_INVALID_ARGUMENT = 'Invalid argument';

/**
 *
 * @param id
 * @returns {?Crypto}
 */
Peeracle.Hash.createInstance = function createInstance(id) {
  var c;

  if (typeof id !== 'string') {
    throw new TypeError(Peeracle.Hash.ERR_INVALID_ARGUMENT);
  }

  for (c in Peeracle.Hash) {
    if (Peeracle.Hash.hasOwnProperty(c) &&
      Peeracle.Hash[c].hasOwnProperty('prototype') &&
      Peeracle.Hash[c].prototype instanceof Peeracle.Hash &&
      Peeracle.Hash[c].hasOwnProperty('IDENTIFIER') &&
      Peeracle.Hash[c].IDENTIFIER === id) {
      return new Peeracle.Hash[c]();
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
Peeracle.Hash.prototype.checksum = function checksum(array) {
};

/* istanbul ignore next */
/**
 * @function
 */
Peeracle.Hash.prototype.init = function init() {
};

/* istanbul ignore next */
/**
 * @function
 * @param array
 */
Peeracle.Hash.prototype.update = function update(array) {
};

/* istanbul ignore next */
/**
 * @function
 */
Peeracle.Hash.prototype.finish = function finish() {
};

/* istanbul ignore next */
/**
 *
 * @param value
 * @param {Peeracle.DataStream} stream
 */
Peeracle.Hash.prototype.serialize = function serialize(value, stream) {
};

/* istanbul ignore next */
/**
 *
 * @param {Peeracle.DataStream} stream
 */
Peeracle.Hash.prototype.unserialize = function unserialize(stream) {
};

/* istanbul ignore next */
Peeracle.Hash.prototype.toString = function toString() {
};

/* eslint-enable */
// @exclude
module.exports = Peeracle.Hash;
// @endexclude
