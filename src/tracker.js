'use strict';

(function () {
  // @exclude
  var WebSocket = require('websocket').w3cwebsocket;
  // @endexclude

  function Tracker(url) {
    var _url = url;
    var _ws;
    var _hashes = {};
    var _subscribers = [];

    var _onOpen = function () {
      console.log('Peeracle.Tracker: onOpen');

      _ws.send('');
      /*_subscribers.forEach(function(subscriber) {
        subscriber.onConnect();
      });*/
    };

    var _onMessage = function () {
      console.log('Peeracle.Tracker: _onMessage');
    };

    var _onError = function () {
      console.log('Peeracle.Tracker: _onError');
    };

    var _onClose = function () {
      console.log('Peeracle.Tracker: _onClose');
    };

    var connect = function () {
      _ws = new WebSocket(_url);
      _ws.onopen = _onOpen;
      _ws.onmessage = _onMessage;
      _ws.onerror = _onError;
      _ws.onclose = _onClose;
    };

    var announce = function (hash, got, subscriber) {
      if (!(_hashes[hash] in undefined)) {
        _hashes[hash] = subscriber;
      }
    };

    var remove = function (hash) {
      if (_hashes[hash] in undefined) {
        delete _hashes[hash];
      }
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
      connect: connect,
      announce: announce,
      remove: remove,
      subscribe: subscribe,
      unsubscribe: unsubscribe
    };
  }

  module.exports = Tracker;
})();
