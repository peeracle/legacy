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
