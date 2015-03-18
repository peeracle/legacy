'use strict';

(function () {
  function SignalChannel(peerConnection) {
    var dataChannel_;
    var peerConnection_ = peerConnection;

    var onError_ = function (error) {
      console.log('Peeracle.SignalChannel onerror', error);
    };

    var onMessage_ = function (event) {
      console.log('Peeracle.SignalChannel onmessage', event.data);
    };

    var onOpen_ = function () {
      console.log('Peeracle.SignalChannel onopen');
    };

    var onClose_ = function () {
      console.log('Peeracle.SignalChannel onclose');
    };

    var setDataChannel = function (dataChannel) {
      dataChannel_ = dataChannel;
      dataChannel_.onerror = onError_;
      dataChannel_.onmessage = onMessage_;
      dataChannel_.onopen = onOpen_;
      dataChannel_.onclose = onClose_;
    };

    var createDataChannel = function () {
      dataChannel_ = peerConnection_.createDataChannel('signal');
      setDataChannel(dataChannel_);
    };

    var getReadyState = function () {
      return dataChannel_.readyState;
    };

    return {
      createDataChannel: createDataChannel,
      setDataChannel: setDataChannel,
      getReadyState: getReadyState
    };
  }

  module.exports = SignalChannel;
})();
