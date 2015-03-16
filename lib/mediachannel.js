'use strict';

if (typeof module === 'undefined') {
  var Peeracle = (Peeracle || {});
}

(function () {
  function MediaChannel() {
    var dataChannel_;

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

    var setupDataChannel = function (dataChannel) {
      dataChannel_.onerror = onError_;
      dataChannel_.onmessage = onMessage_;
      dataChannel_.onopen = onOpen_;
      dataChannel_.onclose = onClose_;
    };

    return {
      setupDataChannel: setupDataChannel
    };
  }

  if (typeof module === 'undefined') {
    Peeracle.MediaChannel = MediaChannel;
  } else {
    module.exports = MediaChannel;
  }
})();
