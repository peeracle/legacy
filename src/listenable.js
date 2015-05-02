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
   * @class
   * @memberof Peeracle
   * @constructor
   */
  function Listenable() {
    this.listeners = {};
  }

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.on = function (type, listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  };

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.once = function (type, listener) {
    var self = this;

    function wrappedListener() {
      self.off(type, wrappedListener);
      listener.apply(null, arguments);
    }

    wrappedListener.__originalListener = listener;
    this.on(type, wrappedListener);
  };

  /**
   *
   * @param type
   * @param listener
   */
  Listenable.prototype.off = function (type, listener) {
    if (this.listeners[type]) {
      if (listener) {
        this.listeners[type] = this.listeners[type].filter(function (l) {
          return l !== listener && l.__originalListener !== listener;
        });
      } else {
        delete this.listeners[type];
      }
    }
  };

  /**
   *
   * @param type
   */
  Listenable.prototype.emit = function (type) {
    if (this.listeners[type]) {
      var args = [].slice.call(arguments, 1);
      this.listeners[type].forEach(function (listener) {
        listener.apply(null, args);
      });
    }
  };

  module.exports = Listenable;
})();
