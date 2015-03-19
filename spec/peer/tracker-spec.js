/* eslint-disable */
'use strict';

if (typeof Peeracle === 'undefined') {
  var Peeracle = require('../../src/peeracle.js');
}

describe('Peeracle.Tracker', function () {
  var tracker;

  it('should connect to a tracker', function (done) {
    var subscriber = {
      onConnect: function () {
        done();
      }
    };

    tracker = new Peeracle.Tracker('ws://127.0.0.1:8080');
    tracker.subscribe(subscriber);
    tracker.connect();
  });
});