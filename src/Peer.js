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
var Listenable = require('./Listenable');
// @endexclude

/**
 * @class
 * @constructor
 * @memberof Peeracle
 */
function Peer() {

}

Peer.prototype = Object.create(Listenable.prototype);

module.exports = Peer;

/*
 function Peer() {
 var _subscribers = [];
 var _peerConnection;
 var _signalDataChannel;
 var _mediaDataChannel;
 var _ready;

 var _onIceCandidate = function (event) {
 if (!_peerConnection || !event) {
 return;
 }

 var ice = event.candidate;
 _subscribers.forEach(function (subscriber) {
 subscriber.onIceCandidate(ice);
 });
 };


 var _onMediaError = function (error) {
 console.log('Peeracle.MediaChannel onerror', error);
 };

 var _onMediaMessage = function (event) {
 _subscribers.forEach(function (subscriber) {
 subscriber.onData(new Uint8Array(event.data));
 });
 };

 var _onMediaOpen = function (event) {
 if ((event.target && event.target.readyState.toLowerCase() === 'open') || event.type === 'open') {
 _ready++;
 if (_ready === 2) {
 console.log('we are ready.');
 _subscribers.forEach(function (subscriber) {
 subscriber.onReady();
 });
 }
 }
 };

 var _onMediaClose = function () {
 console.log('Peeracle.MediaChannel onclose');
 };

 var _setMediaDataChannel = function (dataChannel) {
 dataChannel.onerror = _onMediaError;
 dataChannel.onmessage = _onMediaMessage;
 dataChannel.onopen = _onMediaOpen;
 dataChannel.onclose = _onMediaClose;
 };

 var _onSignalError = function (error) {
 console.log('Peeracle.SignalChannel onerror', error);
 };

 var _onSignalMessage = function (event) {
 var data = JSON.parse(event.data);
 if (data.type === 'request') {
 _subscribers.forEach(function (subscriber) {
 subscriber.onRequest(data.cluster, data.chunk);
 });
 }
 };

 var _onSignalOpen = function (event) {
 if ((event.target && event.target.readyState.toLowerCase() === 'open') || event.type === 'open') {
 _ready++;
 if (_ready === 2) {
 console.log('we are ready.');
 _subscribers.forEach(function (subscriber) {
 subscriber.onReady();
 });
 }
 }
 };

 var _onSignalClose = function () {
 console.log('Peeracle.SignalChannel onclose');
 };

 var _setSignalDataChannel = function (dataChannel) {
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
 _peerConnection.ondatachannel = _onDataChannel;
 _ready = 0;
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

 var request = function (cluster, chunk) {
 _signalDataChannel.send(JSON.stringify({type: 'request', cluster: cluster, chunk: chunk}));
 };

 var sendData = function (data) {
 var index = 0;
 var size = 16384;
 var process = setInterval(function () {
 if (_mediaDataChannel.bufferedAmount) {
 return;
 }

 if (index + size > data.length) {
 size = data.length - index;
 clearInterval(process);
 }

 _mediaDataChannel.send(data.subarray(index, index + size));
 index += size;
 }, 1);
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
 request: request,
 sendData: sendData,
 close: close
 };
 }*/
