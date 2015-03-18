'use strict';

(function () {
  var RTCIceCandidate;
  var RTCPeerConnection;
  var RTCSessionDescription;

  var MediaChannel;
  var SignalChannel;

  if (typeof module === 'undefined') {
    MediaChannel = Peeracle.MediaChannel;
    SignalChannel = Peeracle.SignalChannel;
  } else {
    MediaChannel = require('./mediachannel');
    SignalChannel = require('./signalchannel');
  }

  if (typeof module === 'undefined') {
    RTCIceCandidate = window.mozRTCIceCandidate ||
    window.webkitRTCIceCandidate ||
    window.RTCIceCandidate;

    RTCPeerConnection = window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.RTCPeerConnection;

    RTCSessionDescription = window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.RTCSessionDescription;
  } else {
    var wrtc = require('wrtc');
    RTCPeerConnection = wrtc.RTCPeerConnection;
    RTCSessionDescription = wrtc.RTCSessionDescription;
    RTCIceCandidate = wrtc.RTCIceCandidate;
  }

  function Peer() {
    var subscribers_ = [];
    var peerConnection_;
    var signalChannel_;
    var mediaChannel_;

    var onIceCandidate_ = function (event) {
      if (!peerConnection_ || !event) {
        return;
      }

      var ice = event.candidate;
      if (ice) {
        ice = JSON.stringify(ice);
      }

      for (var i = 0; i < subscribers_.length; i++) {
        subscribers_[i].onIceCandidate(ice);
      }
    };

    var onIceConnectionStateChange_ = function (event) {
      if (!peerConnection_) {
        return;
      }

      for (var i = 0; i < subscribers_.length; i++) {
        subscribers_[i].onConnectionStateChange(peerConnection_.iceConnectionState);
      }
    };

    var onIceGatheringStateChange_ = function () {
    };

    var onReadyStateChange_ = function () {
      console.log('onReadyStateChange_');
    };

    var onDataChannel_ = function (event) {
      if (!event || !event.channel) {
        return;
      }

      if (event.channel.label === 'signal') {
        signalChannel_.setDataChannel(event.channel);
      } else if (event.channel.label === 'media') {
        mediaChannel_.setDataChannel(event.channel);
      }
    };

    var createPeerConnection_ = function () {
      var configuration = {
        iceServers: [
          {
            url: 'stun:stun.l.google.com:19302'
          }
        ]
      };

      peerConnection_ = new RTCPeerConnection(configuration);
      peerConnection_.onicecandidate = onIceCandidate_;
      peerConnection_.oniceconnectionstatechange = onIceConnectionStateChange_;
      peerConnection_.onicegatheringstatechange = onIceGatheringStateChange_;
      peerConnection_.ondatachannel = onDataChannel_;
      peerConnection_.onreadystatechange = onReadyStateChange_;

      signalChannel_ = new SignalChannel(peerConnection_);
      mediaChannel_ = new MediaChannel(peerConnection_);
    };

    var subscribe = function (subscriber) {
      var index = subscribers_.indexOf(subscriber);

      if (!~index) {
        subscribers_.push(subscriber);
      }
    };

    var unsubscribe = function (subscriber) {
      var index = subscribers_.indexOf(subscriber);

      if (~index) {
        subscribers_.splice(index, 1);
      }
    };

    var createOffer = function (successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      createPeerConnection_();

      mediaChannel_.createDataChannel();
      signalChannel_.createDataChannel();
      peerConnection_.createOffer(function (sdp) {
        peerConnection_.setLocalDescription(sdp, function () {
          successCb(JSON.stringify(sdp));
        }, errorFunction);
      }, errorFunction);
    };

    var createAnswer = function (offerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      createPeerConnection_();

      var realSdp = new RTCSessionDescription(JSON.parse(offerSdp));
      peerConnection_.setRemoteDescription(realSdp, function () {
        peerConnection_.createAnswer(function (sdp) {
          peerConnection_.setLocalDescription(sdp, function () {
            successCb(JSON.stringify(sdp));
          }, errorFunction);
        }, errorFunction);
      }, errorFunction);
    };

    var setAnswer = function (answerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      var realSdp = new RTCSessionDescription(JSON.parse(answerSdp));
      peerConnection_.setRemoteDescription(realSdp, function () {
        successCb();
      }, errorFunction);
    };

    var addIceCandidate = function (ice, successCb, failureCb) {
      peerConnection_.addIceCandidate(new RTCIceCandidate(JSON.parse(ice)),
        function () {
          successCb();
        }, function (error) {
          failureCb(error);
        }
      );
    };

    var close = function () {
      peerConnection_.close();
    };

    return {
      subscribe: subscribe,
      unsubscribe: unsubscribe,
      createOffer: createOffer,
      createAnswer: createAnswer,
      setAnswer: setAnswer,
      addIceCandidate: addIceCandidate,
      close: close
    };
  }

  module.exports = Peer;
})();
