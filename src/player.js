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
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
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

(function (global) {
  /*function Player(mediaId) {
    var _player = document.getElementById(mediaId);
    var _metadata;
    var _mediaSource;
    var _sourceBuffer;
    var _bytes = [];
    var _ended = false;
    var _node;

    if (!_player) {
      console.error('Media tag not found');
      return {};
    }

    var _onPlayerTimeUpdate = function () {
      console.log('_onPlayerTimeUpdate', _player.currentTime);
    };

    _player.addEventListener('timeupdate', _onPlayerTimeUpdate);

    var _append = function (bytes) {
      if (_sourceBuffer === null || _sourceBuffer.updating === true) {
        _bytes.push(bytes);
        return;
      }
      _sourceBuffer.appendBuffer(bytes);
    };

    var _end = function () {
      if (_sourceBuffer.updating === true) {
        _ended = true;
        return;
      }
      _mediaSource.endOfStream();
    };

    var _onSourceBufferUpdateStart = function () {
    };

    var _onSourceBufferUpdate = function () {
    };

    var _onSourceBufferUpdateEnd = function () {
      if (_bytes.length) {
        _sourceBuffer.appendBuffer(_bytes.shift());
      } else if (_ended === true) {
        _mediaSource.endOfStream();
      }
    };

    var _onSourceBufferError = function () {
      console.log('_onSourceBufferError');
    };

    var _onSourceBufferAbort = function () {
      console.log('_onSourceBufferAbort');
    };

    var _onMediaSourceOpen = function () {
      console.log('_onMediaSourceOpen');

      _sourceBuffer = _mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp9"');
      _sourceBuffer.addEventListener('updatestart', _onSourceBufferUpdateStart);
      _sourceBuffer.addEventListener('update', _onSourceBufferUpdate);
      _sourceBuffer.addEventListener('updateend', _onSourceBufferUpdateEnd);
      _sourceBuffer.addEventListener('error', _onSourceBufferError);
      _sourceBuffer.addEventListener('abort', _onSourceBufferAbort);

      _append(new Uint8Array(_metadata.getInitSegment()));
      _node = new Peeracle.Node(_metadata);
      _node.start();
      _node.retrieveCluster(0, function () {
      }, function received(bytes) {
        _append(bytes);
      });
    };

    var _onMediaSourceEnded = function () {
      console.log('_onMediaSourceEnded');
    };

    var _onMediaSourceClose = function () {
      console.log('_onMediaSourceClose');
    };

    var _transferComplete = function (evt) {
      if (this.status < 200 || this.status >= 400) {
        console.log('failed');
        return;
      }
      var bytes = new Uint8Array(this.response);

      var arr = [];
      for (var i in bytes) {
        arr[i] = bytes[i];
      }

      var unserializer = new Peeracle.MetadataUnserializer();
      _metadata = new Peeracle.Metadata();
      unserializer.unserialize(arr, _metadata);

      _mediaSource = new MediaSource();
      _mediaSource.addEventListener('sourceopen', _onMediaSourceOpen);
      _mediaSource.addEventListener('sourceended', _onMediaSourceEnded);
      _mediaSource.addEventListener('sourceclose', _onMediaSourceClose);

      _player.src = window.URL.createObjectURL(_mediaSource);
    };

    var req = new XMLHttpRequest();
    req.responseType = 'arraybuffer';
    req.addEventListener('load', _transferComplete, false);
    req.open('GET', _player.src, true);
    req.send();

    return {

    };
  }*/

  function Player(mediaElement) {
    var _mediaElement = mediaElement;
    var _metadata;
    var _mediaSource;
    var _sourceBuffer;
    var _bytes = [];
    var _ended = false;
    var _node;

    if (typeof _mediaElement === 'string') {
      _mediaElement = document.getElementById(_mediaElement);
    }

    if (!((typeof _mediaElement === 'object') && (_mediaElement instanceof HTMLMediaElement))) {
      throw 'Argument must be a media element.';
    }

    var _onMediaElementSeeking = function () {
      console.log('_onMediaElementSeeking', _mediaElement.currentTime);
    };

    var _onMediaElementTimeUpdate = function () {
      console.log('_onMediaElementTimeUpdate', _mediaElement.currentTime);
    };

    _mediaElement.addEventListener('seeking', _onMediaElementSeeking);
    _mediaElement.addEventListener('timeupdate', _onMediaElementTimeUpdate);

    var _append = function (bytes) {
      if (_sourceBuffer === null || _sourceBuffer.updating === true) {
        _bytes.push(bytes);
        return;
      }_player
      _sourceBuffer.appendBuffer(bytes);
    };

    var _end = function () {
      if (_sourceBuffer.updating === true) {
        _ended = true;
        return;
      }
      _mediaSource.endOfStream();
    };

    var _onSourceBufferUpdateStart = function () {
    };

    var _onSourceBufferUpdate = function () {
    };

    var _onSourceBufferUpdateEnd = function () {
      if (_bytes.length) {
        _sourceBuffer.appendBuffer(_bytes.shift());
      } else if (_ended === true) {
        _mediaSource.endOfStream();
      }
    };

    var _onSourceBufferError = function () {
      console.log('_onSourceBufferError');
    };

    var _onSourceBufferAbort = function () {
      console.log('_onSourceBufferAbort');
    };

    var _onMediaSourceOpen = function () {
      console.log('_onMediaSourceOpen');

      _sourceBuffer = _mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp9"');
      _sourceBuffer.addEventListener('updatestart', _onSourceBufferUpdateStart);
      _sourceBuffer.addEventListener('update', _onSourceBufferUpdate);
      _sourceBuffer.addEventListener('updateend', _onSourceBufferUpdateEnd);
      _sourceBuffer.addEventListener('error', _onSourceBufferError);
      _sourceBuffer.addEventListener('abort', _onSourceBufferAbort);
      _append(new Uint8Array(_metadata.getInitSegment()));

      _node = new Peeracle.Node(_metadata);
      _node.start();
      _node.retrieveCluster(0, function () {
      }, function received(bytes) {
        _append(bytes);
      });
    };

    var _onMediaSourceEnded = function () {
      console.log('_onMediaSourceEnded');
    };

    var _onMediaSourceClose = function () {
      console.log('_onMediaSourceClose');
    };

    var _downloadMetadata = function () {
      var req = new XMLHttpRequest();
      req.responseType = 'arraybuffer';
      req.addEventListener('load', function (evt) {
        if (this.status < 200 || this.status >= 400) {
          console.log('failed');
          return;
        }
        var bytes = new Uint8Array(this.response);

        var arr = [];
        for (var i in bytes) {
          arr[i] = bytes[i];
        }

        var unserializer = new Peeracle.MetadataUnserializer();
        _metadata = new Peeracle.Metadata();
        unserializer.unserialize(arr, _metadata);

        _mediaSource = new MediaSource();
        _mediaSource.addEventListener('sourceopen', _onMediaSourceOpen);
        _mediaSource.addEventListener('sourceended', _onMediaSourceEnded);
        _mediaSource.addEventListener('sourceclose', _onMediaSourceClose);

        _mediaElement.src = window.URL.createObjectURL(_mediaSource);
      }, false);
      req.open('GET', _mediaElement.src, true);
      req.send();
    };

    _downloadMetadata();

    return {

    };
  }

  module.exports = Player;
})(Peeracle || this);
