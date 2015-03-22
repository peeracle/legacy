'use strict';

(function () {
  var Peeracle = {};
  Peeracle.File = require('./file');
  Peeracle.Media = require('./media');
  Peeracle.Metadata = require('./metadata');
  Peeracle.MetadataSerializer = require('./metadata.serializer');
  Peeracle.MetadataUnserializer = require('./metadata.unserializer');
  Peeracle.Peer = require('./peer');
  Peeracle.Tracker = require('./tracker');
  Peeracle.Utils = require('./utils');
  module.exports = Peeracle;
})();
