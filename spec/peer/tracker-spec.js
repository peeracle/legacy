/* eslint-disable */
'use strict';

if (typeof Peeracle === 'undefined') {
  var Peeracle = require('../../src/peeracle.js');
}

describe('Peeracle.Tracker', function () {
  var client;
  var server;

  if (typeof require !== 'undefined') {
    it('should start a tracker server', function () {
      server = new Peeracle.Tracker.Server();
      server.listen('127.0.0.1', 8080);
    });
  }

  it('should connect to a tracker', function (done) {
    var subscriber = {
      onConnect: function () {
        client.unsubscribe(subscriber);
        client.announce('123456', '000000');
        done();
      }
    };

    client = new Peeracle.Tracker.Client();
    client.subscribe(subscriber);
    client.connect('ws://127.0.0.1:8080');
  });

  it('should disconnect from the tracker', function () {
    client.disconnect();
  });

  if (typeof require !== 'undefined') {
    it('should stop the tracker server', function () {
      server.close();
    });
  }
});