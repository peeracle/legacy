'use strict';

(function(){
  var Tracker = {};
  Tracker.Client = require('./tracker.client');
  Tracker.Server = require('./tracker.server');
  module.exports = Tracker;
})();
