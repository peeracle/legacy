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

// @exclude
var Listenable = require('./../Listenable');
var RTCPeerConnection = require('wrtc').RTCPeerConnection;
var RTCSessionDescription = require('wrtc').RTCSessionDescription;
var RTCIceCandidate = require('wrtc').RTCIceCandidate;
var Peeracle = {
  Peer: {
    Message: require('./Message')
  }
};
// @endexclude

/**
 * @class
 * @constructor
 */
Peeracle.Peer.Connection = function Connection() {
  var STUN = {
    url: 'stun:stun.l.google.com:19302'
  };

  var RTCConfiguration = {
    iceServers: [
      {
        url: 'stun:23.21.150.121',
        urls: 'stun:23.21.150.121'
      }, {
        url: 'stun:stun.l.google.com:19302',
        urls: 'stun:stun.l.google.com:19302'
      }
    ],
    iceTransports: 'all', // none relay all
    peerIdentity: null
  };

  this.mediaConstraints_ = {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  };

  Listenable.call(this);

  /** @type {RTCPeerConnection} */
  this.peerConnection_ = new RTCPeerConnection(RTCConfiguration,
    this.mediaConstraints_);
  this.peerConnection_.onicecandidate = this.onIceCandidate_.bind(this);
  this.peerConnection_.onsignalingstatechange =
    this.onSignalingStateChange_.bind(this);
  this.peerConnection_.oniceconnectionstatechange =
    this.onIceConnectionStateChange_.bind(this);
  this.peerConnection_.onicegatheringstatechange =
    this.onIceGatheringStateChange_.bind(this);
  this.peerConnection_.ondatachannel =
    this.onDataChannel_.bind(this);

  /** @type {RTCDataChannel} */
  this.signalDataChannel_ = null;
};

Peeracle.Peer.Connection.prototype = Object.create(Listenable.prototype);
Peeracle.Peer.Connection.prototype.constructor = Peeracle.Peer.Connection;

Peeracle.Peer.Connection.prototype.onIceCandidate_ =
  function onIceCandidate_(sdp) {
    var candidate;

    if (!sdp.candidate) {
      candidate = null;
    } else {
      candidate = JSON.stringify(sdp);
    }

    this.emit('icecandidate', candidate);
  };

Peeracle.Peer.Connection.prototype.onSignalingStateChange_ =
  function onSignalingStateChange_() {
    console.log('onSignalingStateChange_', this.peerConnection_.signalingState);
  };

Peeracle.Peer.Connection.prototype.onIceConnectionStateChange_ =
  function onIceConnectionStateChange_() {
    console.log('onIceConnectionStateChange_', this.peerConnection_.iceConnectionState);
  };

Peeracle.Peer.Connection.prototype.onIceGatheringStateChange_ =
  function onIceGatheringStateChange_() {
    console.log('onIceGatheringStateChange_', this.peerConnection_.iceGatheringState);
  };

Peeracle.Peer.Connection.prototype.send = function send(message) {
  this.signalDataChannel_.send(message.serialize());
};

Peeracle.Peer.Connection.prototype.onDataChannel_ =
  function onDataChannel_(ev) {
    var message;

    console.log('onDataChannel_', ev.channel.label);
    if (ev.channel.label === 'signal') {
      this.signalDataChannel_ = ev.channel;
      this.signalDataChannel_.binaryType = 'arraybuffer';
      this.signalDataChannel_.onerror = this.onSignalError_.bind(this);
      this.signalDataChannel_.onmessage = this.onSignalMessage_.bind(this);
      this.signalDataChannel_.onstatechange = this.onSignalStateChange_.bind(this);

      message = new Peeracle.Peer.Message({
        type: Peeracle.Peer.Message.Type.Ping,
        reply: 0
      });

      this.send(message);
    }
  };

Peeracle.Peer.Connection.prototype.onSignalError_ = function onSignalError_(ev) {
  console.log('onSignalError_', ev);
};

Peeracle.Peer.Connection.prototype.onSignalMessage_ =
  function onSignalMessage_(ev) {
    var message = new Peeracle.Peer.Message(new Uint8Array(ev.data));

    console.log('onSignalMessage_', message);
    if (message.props.type === Peeracle.Peer.Message.Type.Ping) {
      if (message.props.reply === 0) {
        message.props.reply = 1;
        this.signalDataChannel_.send(message.serialize());
      }
      if (message.props.reply < 2) {
        this.emit('connected');
      }
    } else if (message.props.type === Peeracle.Peer.Message.Type.Request) {
      this.emit('request', message.props.hash, message.props.cluster,
        message.props.chunk);
    }
  };

Peeracle.Peer.Connection.prototype.onSignalStateChange_ =
  function onSignalStateChange_(state) {
    console.log('onSignalStateChange_', state);
  };

Peeracle.Peer.Connection.prototype.createOffer = function createOffer_(cb) {
  this.signalDataChannel_ = this.peerConnection_.createDataChannel('signal');
  this.signalDataChannel_.binaryType = 'arraybuffer';
  this.signalDataChannel_.onerror = this.onSignalError_.bind(this);
  this.signalDataChannel_.onmessage = this.onSignalMessage_.bind(this);
  this.signalDataChannel_.onstatechange = this.onSignalStateChange_.bind(this);
  this.peerConnection_.createOffer(function successCb(sdp) {
    this.peerConnection_.setLocalDescription(sdp, function ssuccessCb() {
      cb(JSON.stringify(sdp));
    }, function ffailureCb() {
      cb(null);
    }, this.mediaConstraints_);
  }.bind(this), function failureCb() {
    cb(null);
  });
};

Peeracle.Peer.Connection.prototype.createAnswer =
  function createAnswer_(offerSdp, cb) {
    this.peerConnection_.setRemoteDescription(
      new RTCSessionDescription(JSON.parse(offerSdp)),
      function successCb() {
        this.peerConnection_.createAnswer(function ssuccessCb(sdp) {
          this.peerConnection_.setLocalDescription(sdp, function sssuccessCb() {
            cb(JSON.stringify(sdp));
          }, function fffailureCb() {
            cb(null);
          }, this.mediaConstraints_);
        }.bind(this), function ffailureCb() {
          cb(null);
        });
      }.bind(this), function failureCb() {
        cb(null);
      });
  };

Peeracle.Peer.Connection.prototype.setAnswer =
  function setAnswer_(answerSdp, cb) {
    this.peerConnection_.setRemoteDescription(
      new RTCSessionDescription(JSON.parse(answerSdp)),
      function successCb() {
        cb(true);
      }, function failureCb() {
        cb(false);
      });
  };

Peeracle.Peer.Connection.prototype.addICECandidate =
  function addICECandidate_(sdp, cb) {
    this.peerConnection_.addIceCandidate(new RTCIceCandidate(JSON.parse(sdp)),
      function successCb() {
        cb(true);
      }, function failureCb() {
        cb(false);
      });
  };

// @exclude
module.exports = Peeracle.Peer.Connection;
// @endexclude
