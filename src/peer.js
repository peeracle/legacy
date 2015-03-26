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
  var RTCIceCandidate;
  var RTCPeerConnection;
  var RTCSessionDescription;

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
    var _subscribers = [];
    var _peerConnection;
    var _signalDataChannel;
    var _mediaDataChannel;

    var _onIceCandidate = function (event) {
      if (!_peerConnection || !event) {
        return;
      }

      var ice = event.candidate;
      _subscribers.forEach(function(subscriber) {
        subscriber.onIceCandidate(ice);
      });
    };

    /*var _onIceConnectionStateChange = function (event) {
      if (!_peerConnection || !event) {
        return;
      }

      _subscribers.forEach(function(subscriber) {
        subscriber.onConnectionStateChange(_peerConnection.iceConnectionState);
      });
    };

    var _onIceGatheringStateChange = function () {
    };

    var _onReadyStateChange = function () {
      console.log('_onReadyStateChange');
    };*/

    var _onMediaError = function (error) {
      console.log('Peeracle.MediaChannel onerror', error);
    };

    var _onMediaMessage = function (event) {
      console.log('Peeracle.MediaChannel onmessage', event.data);
    };

    var _onMediaOpen = function () {
      console.log('Peeracle.MediaChannel onopen');
    };

    var _onMediaClose = function () {
      console.log('Peeracle.MediaChannel onclose');
    };

    var _setSignalDataChannel = function (dataChannel) {
      dataChannel.onerror = _onMediaError;
      dataChannel.onmessage = _onMediaMessage;
      dataChannel.onopen = _onMediaOpen;
      dataChannel.onclose = _onMediaClose;
    };

    var _onSignalError = function (error) {
      console.log('Peeracle.SignalChannel onerror', error);
    };

    var _onSignalMessage = function (event) {
      console.log('Peeracle.SignalChannel onmessage', event.data);
    };

    var _onSignalOpen = function () {
      console.log('Peeracle.SignalChannel onopen');
    };

    var _onSignalClose = function () {
      console.log('Peeracle.SignalChannel onclose');
    };

    var _setMediaDataChannel = function (dataChannel) {
      dataChannel.onerror = _onSignalError;
      dataChannel.onmessage = _onSignalMessage;
      dataChannel.onopen = _onSignalOpen;
      dataChannel.onclose = _onSignalClose;
    };

    var _onDataChannel = function (event) {
      if (!event || !event.channel) {
        return;
      }

      if (event.channel.label === 'signal') {
        _signalDataChannel = event.channel;
        _setSignalDataChannel(_signalDataChannel);
      } else if (event.channel.label === 'media') {
        _mediaDataChannel = event.channel;
        _setMediaDataChannel(_mediaDataChannel);
      }
    };

    var _createDataChannels = function () {
      _signalDataChannel = _peerConnection.createDataChannel('signal');
      _mediaDataChannel = _peerConnection.createDataChannel('media');

      _setSignalDataChannel(_signalDataChannel);
      _setMediaDataChannel(_mediaDataChannel);
    };

    var _createPeerConnection = function () {
      var configuration = {
        iceServers: [
          {
            url: 'stun:stun.l.google.com:19302'
          }
        ]
      };

      _peerConnection = new RTCPeerConnection(configuration);
      _peerConnection.onicecandidate = _onIceCandidate;
      /*_peerConnection.oniceconnectionstatechange = _onIceConnectionStateChange;
      _peerConnection.onicegatheringstatechange = _onIceGatheringStateChange;*/
      _peerConnection.ondatachannel = _onDataChannel;
      // _peerConnection.onreadystatechange = _onReadyStateChange;
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

    var createOffer = function (successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      _createPeerConnection();
      _createDataChannels();
      _peerConnection.createOffer(function (sdp) {
        _peerConnection.setLocalDescription(sdp, function () {
          successCb(sdp);
        }, errorFunction);
      }, errorFunction);
    };

    var createAnswer = function (offerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      _createPeerConnection();
      var realSdp = new RTCSessionDescription(offerSdp);
      _peerConnection.setRemoteDescription(realSdp, function () {
        _peerConnection.createAnswer(function (sdp) {
          _peerConnection.setLocalDescription(sdp, function () {
            successCb(sdp);
          }, errorFunction);
        }, errorFunction);
      }, errorFunction);
    };

    var setAnswer = function (answerSdp, successCb, failureCb) {
      var errorFunction = function (error) {
        failureCb(error);
      };

      var realSdp = new RTCSessionDescription(answerSdp);
      _peerConnection.setRemoteDescription(realSdp, function () {
        successCb();
      }, errorFunction);
    };

    var addIceCandidate = function (ice, successCb, failureCb) {
      _peerConnection.addIceCandidate(new RTCIceCandidate(ice),
        function () {
          successCb();
        }, function (error) {
          failureCb(error);
        }
      );
    };

    var close = function () {
      _peerConnection.close();
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
