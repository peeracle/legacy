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

/**
 * Peeracle
 * @namespace Peeracle
 */

(function () {
  'use strict';

  var Crypto = require('./Crypto');
  Crypto.Crc32 = require('./Crypto.Crc32.js');

  var DataSource = require('./DataSource.js');
  DataSource.File = require('./DataSource.File.js');
  DataSource.Http = require('./DataSource.Http.js');

  var Media = require('./Media');
  Media.WebM = require('./Media.WebM.js');

  var Tracker = {
    Client: require('./Tracker.Client.js'),
    Server: require('./Tracker.Server.js')
  };

  module.exports = {
    BinaryStream: require('./BinaryStream'),
    Crypto: Crypto,
    DataSource: DataSource,
    Media: require('./Media'),
    Metadata: require('./Metadata'),
    MetadataSerializer: require('./Metadata.Serializer.js'),
    MetadataUnserializer: require('./Metadata.Unserializer.js'),
    Tracker: Tracker
    //Node: require('./node'),
    //Peer: require('./peer'),
    //Utils: require('./utils')
  };
})();
