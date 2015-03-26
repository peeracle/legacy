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
  function SignalChannel(peerConnection) {
    var _dataChannel;
    var _peerConnection = peerConnection;

    var _onError = function (error) {
      console.log('Peeracle.SignalChannel onerror', error);
    };

    var _onMessage = function (event) {
      console.log('Peeracle.SignalChannel onmessage', event.data);
    };

    var _onOpen = function () {
      console.log('Peeracle.SignalChannel onopen');
    };

    var _onClose = function () {
      console.log('Peeracle.SignalChannel onclose');
    };

    var setDataChannel = function (dataChannel) {
      _dataChannel = dataChannel;
      _dataChannel.onerror = _onError;
      _dataChannel.onmessage = _onMessage;
      _dataChannel.onopen = _onOpen;
      _dataChannel.onclose = _onClose;
    };

    var createDataChannel = function () {
      _dataChannel = _peerConnection.createDataChannel('signal');
      setDataChannel(_dataChannel);
    };

    var getReadyState = function () {
      return _dataChannel.readyState;
    };

    return {
      createDataChannel: createDataChannel,
      setDataChannel: setDataChannel,
      getReadyState: getReadyState
    };
  }

  module.exports = SignalChannel;
})();
