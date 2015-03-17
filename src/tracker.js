'use strict';

var Peeracle = Peeracle || {};
(function () {
  function Tracker() {
    return {
    };
  }

  if (typeof module === 'undefined') {
    Peeracle.Tracker = Tracker;
  } else {
    module.exports = Tracker;
  }
})();
