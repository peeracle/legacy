/* eslint-disable */
'use strict';

if (typeof Peeracle === 'undefined') {
  var Peeracle = require('../../src/peeracle.js');
}

describe('Peeracle.Peer', function () {
  var pa = null;
  var pb = null;
  var pasdp = null;
  var pbsdp = null;
  var paice = [];
  var pbice = [];

  it('should create a new peer', function () {
    pa = new Peeracle.Peer();
    expect(pa).toBeDefined();
  });

  it('should have it\'s members defined', function () {
    expect(pa.subscribe).toBeDefined();
    expect(pa.unsubscribe).toBeDefined();
    expect(pa.createOffer).toBeDefined();
    expect(pa.createAnswer).toBeDefined();
    expect(pa.setAnswer).toBeDefined();
    expect(pa.addIceCandidate).toBeDefined();
  });

  it('should have function members', function () {
    expect(typeof pa.subscribe).toBe('function');
    expect(typeof pa.unsubscribe).toBe('function');
    expect(typeof pa.createOffer).toBe('function');
    expect(typeof pa.createAnswer).toBe('function');
    expect(typeof pa.setAnswer).toBe('function');
    expect(typeof pa.addIceCandidate).toBe('function');
  });

  it('should create an offer', function (done) {
    var subscriber = {
      onIceCandidate: function (ice) {
        if (ice == null) {
          pa.unsubscribe(subscriber);
          done();
          return;
        }
        paice.push(ice);
      },
      onConnectionStateChange: function (state) {

      }
    };

    pa.subscribe(subscriber);
    pa.createOffer(function (sdp) {
      pasdp = sdp;
    }, function (error) {
      console.error(error);
      pasdp = null;
      expect(typeof pasdp).toBe('string');
      done();
    });
  }, 10000);

  it('should create another peer', function () {
    pb = new Peeracle.Peer();
    expect(pb).toBeDefined();
  });

  it('should create an answer', function (done) {
    var subscriber = {
      onIceCandidate: function (ice) {
        if (ice == null) {
          pb.unsubscribe(subscriber);
          done();
          return;
        }
        pbice.push(ice);
      },

      onConnectionStateChange: function (state) {

      }
    };

    pb.subscribe(subscriber);
    pb.createAnswer(pasdp, function (sdp) {
      pbsdp = sdp;
    }, function (error) {
      console.error(error);
      pbsdp = null;
      expect(typeof pbsdp).toBe('string');
      done();
    });
  }, 10000);

  it('should set the answer', function (done) {
    pa.setAnswer(pbsdp, function () {
      done();
    }, function (error) {
      console.error(error);
      pbsdp = null;
      expect(typeof pbsdp).toBe('string');
      done();
    });
  });

  it('should add every ice candidates', function (done) {
    var pastate = false;
    var pbstate = false;

    var pasubscriber = {
      onIceCandidate: function (ice) {

      },
      onConnectionStateChange: function (state) {
        if (state === 'completed' || state === 'connected') {
          pastate = true;
        }
        if (pastate === true && pbstate === true) {
          pa.unsubscribe(pasubscriber);
          pb.unsubscribe(pbsubscriber);
          done();
        }
      }
    };
    pa.subscribe(pasubscriber);

    var pbsubscriber = {
      onIceCandidate: function (ice) {

      },
      onConnectionStateChange: function (state) {
        if (state === 'completed' || state === 'connected') {
          pbstate = true;
        }
        if (pastate === true && pbstate === true) {
          pa.unsubscribe(pasubscriber);
          pb.unsubscribe(pbsubscriber);
          done();
        }
      }
    };
    pb.subscribe(pbsubscriber);

    for (var i = 0; i < pbice.length; i++) {
      pa.addIceCandidate(pbice[i], function () {
      }, function (error) {
        console.error(error);
        done();
      });
    }

    for (var i = 0; i < paice.length; i++) {
      pb.addIceCandidate(paice[i], function () {
      }, function (error) {
        console.error(error);
        done();
      });
    }
  });

  it('should close everything', function () {
    pa.close();
    pb.close();
  });
});