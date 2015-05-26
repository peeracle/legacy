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

/**
 * Peeracle
 * @namespace Peeracle
 */

// @exclude
var Peeracle = require('./src/Peeracle');

Peeracle.BinaryStream = require('./src/BinaryStream');

Peeracle.Crypto = require('./src/Crypto');
Peeracle.Crypto.Crc32 = require('./src/Crypto.Crc32');

Peeracle.DataSource = require('./src/DataSource');
Peeracle.DataSource.File = require('./src/DataSource.File');
Peeracle.DataSource.Http = require('./src/DataSource.Http');

Peeracle.Listenable = require('./src/Listenable');

Peeracle.Media = require('./src/Media');
Peeracle.Media.WebM = require('./src/Media.WebM');
Peeracle.Media.MP4 = require('./src/Media.MP4');

Peeracle.Metadata = require('./src/Metadata');
Peeracle.MetadataSerializer = require('./src/MetadataSerializer');
Peeracle.MetadataUnserializer = require('./src/MetadataUnserializer');

Peeracle.Storage = require('./src/Storage');
Peeracle.Storage.NodeFile = require('./src/Storage.NodeFile');
Peeracle.Storage.Memory = require('./src/Storage.Memory');

Peeracle.Tracker = require('./src/Tracker');
Peeracle.Tracker.Client = require('./src/Tracker.Client');
Peeracle.Tracker.Message = require('./src/Tracker.Message');
Peeracle.Tracker.Server = require('./src/Tracker.Server');

Peeracle.Utils = require('./src/Utils');

module.exports = Peeracle;

return;
// @endexclude

window['Peeracle'] = Peeracle;

var RTCPeerConnection = window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.RTCPeerConnection;

var RTCSessionDescription = window.mozRTCSessionDescription ||
  window.webkitRTCSessionDescription ||
  window.RTCSessionDescription;

var RTCIceCandidate = window.mozRTCIceCandidate ||
  window.webkitRTCIceCandidate ||
  window.RTCIceCandidate;

function bindMedia(media) {
  if (media.dataset && media.dataset.hasOwnProperty('peeracleIgnore')) {
    return;
  }

  media.pause();
  media.src = '';
}

function bindMedias() {
  var medias = document.querySelectorAll('audio, video');
  var i;
  var l = medias.length;

  for (i = 0; i < l; ++i) {
    var media = medias[i];
    if (media instanceof HTMLVideoElement) {
      bindMedia(media);
    }
  }
}

bindMedias();
