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
var Peeracle = {};
// @endexclude

/* istanbul ignore next */
/**
 * @interface
 * @memberof Peeracle
 * @param {*} handle
 * @constructor
 */
Peeracle.DataStream = function DataStream(handle) {
};

/* eslint-disable */

/* istanbul ignore next */
Peeracle.DataStream.prototype.read = function read(length) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.write = function write(bytes) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readByte = function readByte() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeByte = function writeByte(value) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readFloat4 = function readFloat4() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeFloat4 = function writeFloat4(value) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readFloat8 = function readFloat8() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeFloat8 = function writeFloat8(value) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readInt16 = function readInt16() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeInt16 = function writeInt16(value) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readInt32 = function readInt32() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeInt32 = function writeInt32(value) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readUInt16 = function readUInt16() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeUInt16 = function writeUInt16(value) {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.readUInt32 = function readUInt32() {
};

/* istanbul ignore next */
Peeracle.DataStream.prototype.writeUInt32 = function writeUInt32(value) {
};

/**
 * @param length
 * @returns {string}
 */
Peeracle.DataStream.prototype.readString = function readString(length) {
};

/**
 * @param {string} value
 */
Peeracle.DataStream.prototype.writeString = function writeString(value) {
};

/**
 *
 * @param value
 */
Peeracle.DataStream.prototype.seek = function seek(value) {
};

/* eslint-enable */

// @exclude
module.exports = Peeracle.DataStream;

Peeracle.DataStream.Memory = require('./Memory');
// @endexclude
