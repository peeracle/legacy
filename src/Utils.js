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

Math.trunc = Math.trunc || function trunc(x) {
    return x < 0 ? Math.ceil(x) : Math.floor(x);
  };

/**
 * @class
 * @constructor
 */
function Utils() {
}

/**
 *
 * @param x
 * @returns {number}
 */
Utils.trunc = function utilsTrunc(x) {
  return Math.trunc(x);
};

Utils.stringToArray = function stringToArray(str) {
  var i;
  var l = str.length;
  var arr = [];

  for (i = 0; i < l; ++i) {
    arr.push(str.charCodeAt(i));
  }

  return arr;
};

/**
 *
 * @param {number} d
 * @param {number} padding
 * @returns {string}
 */
Utils.decimalToHex = function decimalToHex(d, padding) {
  var hex = Number(d).toString(16);
  var pad = padding;

  pad = typeof (pad) === 'undefined' || pad === null ? pad = 2 : pad;
  while (hex.length < pad) {
    hex = '0' + hex;
  }
  return hex;
};

module.exports = Utils;
