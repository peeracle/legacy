'use strict';

(function () {
  function MediaChannel(peerConnection) {
    var dataChannel_;
    var peerConnection_ = peerConnection;

    var onError_ = function (error) {
      console.log('Peeracle.MediaChannel onerror', error);
    };

    var onMessage_ = function (event) {
      console.log('Peeracle.MediaChannel onmessage', event.data);
    };

    var onOpen_ = function () {
      console.log('Peeracle.MediaChannel onopen');
    };

    var onClose_ = function () {
      console.log('Peeracle.MediaChannel onclose');
    };

    var setDataChannel = function (dataChannel) {
      dataChannel_ = dataChannel;
      dataChannel_.onerror = onError_;
      dataChannel_.onmessage = onMessage_;
      dataChannel_.onopen = onOpen_;
      dataChannel_.onclose = onClose_;
    };

    var createDataChannel = function () {
      dataChannel_ = peerConnection_.createDataChannel('media');
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

  module.exports = MediaChannel;
})();
