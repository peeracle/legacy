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
