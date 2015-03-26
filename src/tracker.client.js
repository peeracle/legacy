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

(function () {
  // @exclude
  var WebSocket = require('websocket').w3cwebsocket;
  // @endexclude

  function Client() {
    var _url;
    var _ws;
    var _hashes = {};
    var _subscribers = [];

    var _onOpen = function () {
      console.log('Peeracle.Tracker: onOpen');

      _ws.send(JSON.stringify({type: 'hello'}));
    };

    var _onMessage = function (event) {
      console.log('Peeracle.Tracker: _onMessage', event.data);

      var welcome = function (msg) {
        if (!msg.id) {
          return;
        }

        _subscribers.forEach(function (subscriber) {
          subscriber.onConnect(msg.id);
        });
      };

      var enter = function (msg) {
        if (!msg.hash || !msg.peers || !_hashes[msg.hash]) {
          return;
        }

        msg.peers.forEach(function (peer) {
          _hashes[msg.hash].onEnter(peer);
        });
      };

      var leave = function (msg) {
        if (!msg.hash || !msg.id || !_hashes[msg.hash]) {
          return;
        }

        _hashes[msg.hash].onLeave(msg.id);
      };

      var sdp = function (msg) {
        if (!msg.hash || !msg.from || !msg.data || !_hashes[msg.hash]) {
          return;
        }

        _hashes[msg.hash].onSdp(msg.from, msg.data);
      };

      var _messageHandlers = {
        welcome: welcome,
        enter: enter,
        leave: leave,
        sdp: sdp
      };

      var jmessage;

      try {
        jmessage = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (_messageHandlers[jmessage.type]) {
        _messageHandlers[jmessage.type](jmessage);
      }
    };

    var _onError = function () {
      console.log('Peeracle.Tracker: _onError');
    };

    var _onClose = function () {
      console.log('Peeracle.Tracker: _onClose');
    };

    var getUrl = function () {
      return _url;
    };

    var connect = function (url) {
      _url = url;
      _ws = new WebSocket(_url, 'prcl', _url);
      _ws.onopen = _onOpen;
      _ws.onmessage = _onMessage;
      _ws.onerror = _onError;
      _ws.onclose = _onClose;
    };

    var disconnect = function () {
      _subscribers.forEach(function (subscriber, index) {
        subscriber.onDisconnect();
        _subscribers.splice(index, 1);
      });

      _ws.close();
    };

    var announce = function (hash, got, subscriber) {
      if (!_hashes[hash]) {
        _hashes[hash] = subscriber;
      }

      _ws.send(JSON.stringify({type: 'announce', hash: hash, got: got}));
    };

    var remove = function (hash) {
      if (_hashes[hash]) {
        delete _hashes[hash];
      }
    };

    var sendSdp = function (hash, peer, sdp) {
      if (!_hashes[hash]) {
        return;
      }

      _ws.send(JSON.stringify({type: 'sdp', hash: hash, peer: peer, data: sdp}));
    };

    var subscribe = function (subscriber) {
      var index = _subscribers.indexOf(subscriber);

      if (!~index) {
        _subscribers.push(subscriber);
      }
    };

    var unsubscribe = function (subscriber) {
      var index = _subscribers.indexOf(subscriber);

      if (~index) {
        _subscribers.splice(index, 1);
      }
    };

    return {
      getUrl: getUrl,
      connect: connect,
      disconnect: disconnect,
      announce: announce,
      remove: remove,
      sendSdp: sendSdp,
      subscribe: subscribe,
      unsubscribe: unsubscribe
    };
  }

  var Tracker = {
    Client: Client
  };

  module.exports = Tracker.Client;
})();
