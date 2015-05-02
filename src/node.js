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
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function (global) {
  'use strict';

  var Utils = Peeracle.Utils || require('./utils');

  /*var Peer;
  var Tracker;

  // @exclude
  if (typeof module === 'undefined') {
    // @endexclude
    Peer = Peeracle.Peer;
    Tracker = Peeracle.Tracker.Client;
    // @exclude
  } else {
    Peer = require('./peer');
    Tracker = require('./tracker.client');
  }
  // @endexclude

  function Node(metadata) {
    var _got = [];
    var _clusters = [];
    var _peers = [];
    var _metadata = metadata;
    var _requests = [];
    var _trackers = {};
    var _sendCb = null;

    var _gotHasCluster = function (got, cluster) {
      var gotIndex = Math.trunc(cluster / 32);
      var clusterIndex = cluster - (gotIndex * 32);
      return got[gotIndex] & (1 << clusterIndex);
    };

    var _peerObserver = function (peer) {
      var _peer = peer;

      var onIceCandidate = function (ice) {
        _trackers[_peer.trackerUrl].sendSdp(_metadata.getId(), _peer.id, ice);
      };

      var onReady = function () {
        if (_peer.status !== null) {
          _sendRequest(peer);
        }
      };

      var onRequest = function (cluster, chunk) {
        console.log('peer', _peer.id, 'requesting', cluster, chunk);
        _sendCb(cluster, chunk, function (bytes) {
          _peer.conn.sendData(bytes);
        });
      };

      var onData = function (data) {
        for (var ri = 0, rl = _requests.length; ri < rl; ++ri) {
          var request = _requests[ri];
          if (request.cluster === _peer.status.cluster) {
            var chunk = _peer.status.chunk;
            var chunkSize = _metadata.getChunkSize();
            request.buffer.set(data, (chunk * chunkSize) + _peer.status.received);
            _peer.status.received += data.length;

            var chunkOffset = chunk * chunkSize;
            if (chunkOffset + chunkSize > request.buffer.length) {
              chunkSize = request.buffer.length - chunkOffset;
            }

            if (_peer.status.received === chunkSize) {
              request.chunks[chunk].complete = true;
              request.chunks[chunk].peer = null;
              _peer.status = null;
              _checkRequests(_peer);
            }
            return;
          }
        }
      };

      return {
        onIceCandidate: onIceCandidate,
        onReady: onReady,
        onRequest: onRequest,
        onData: onData
      };
    };

    var _sendRequest = function (peer) {
      if (peer.conn === null) {
        peer.conn = new Peer();
        peer.conn.subscribe(new _peerObserver(peer));
        peer.conn.createOffer(function (offer) {
          _trackers[peer.trackerUrl].sendSdp(_metadata.getId(), peer.id, offer);
        }, function (err) {
          throw err;
        });
        return;
      }
      peer.conn.request(peer.status.cluster, peer.status.chunk);
    };

    var _checkRequestsWithPeer = function (peer) {
      for (var ri = 0, rl = _requests.length; ri < rl; ++ri) {
        var request = _requests[ri];
        if (!_gotHasCluster(peer.got, request.cluster)) {
          console.log('peer id', peer.id, 'doesnt have that cluster.');
          continue;
        }
        var complete = true;
        for (var ci = 0, cl = request.chunks.length; ci < cl; ++ci) {
          var chunk = request.chunks[ci];
          if (chunk.complete === true) {
            continue;
          }
          complete = false;
          if (chunk.peer === null) {
            peer.status = {
              cluster: request.cluster,
              chunk: ci,
              received: 0
            };
            chunk.peer = peer;
            _sendRequest(peer);
            return;
          }
        }
        if (complete === true) {
          _requests.splice(ri, 1);
          request.doneCb(request.buffer);
        }
      }
    };

    var _checkRequests = function () {
      for (var pi = 0, pl = _peers.length; pi < pl; ++pi) {
        var peer = _peers[pi];
        if (peer.status === null) {
          _checkRequestsWithPeer(peer);
        }
      }
    };

    var retrieveCluster = function (clusterIndex, progressCb, doneCb) {
      var cluster = _metadata.getMediaSegmentAt(clusterIndex);
      var request = {
        cluster: clusterIndex,
        chunks: [],
        buffer: new Uint8Array(cluster.length),
        progressCb: progressCb,
        doneCb: doneCb
      };

      for (var ci = 0, cl = cluster.chunks.length; ci < cl; ++ci) {
        request.chunks.push({
          peer: null,
          complete: false
        });
      }

      _requests.push(request);
      _checkRequests();
    };

    var _announceObserver = function (url) {
      var _url = url;

      var onEnter = function (peerId, peerGot) {
        console.log('[' + _url + '] ' + 'Peer ' + parseInt(peerId) + ' entered');
        var peer = {
          id: peerId,
          got: peerGot,
          trackerUrl: _url,
          conn: null,
          status: null
        };
        _peers.push(peer);
        _checkRequests();
      };

      var onLeave = function (peerId) {
        console.log('[' + _url + '] ' + 'Peer ' + parseInt(peerId) + ' left');
      };

      var _handleSdp = function (peer, data) {
        if (data.type === 'offer' ) {
          if (!peer.conn) {
            peer.conn = new Peer();
            peer.conn.subscribe(new _peerObserver(peer));
          }
          peer.conn.createAnswer(data, function (answer) {
            _trackers[_url].sendSdp(_metadata.getId(), peer.id, answer);
          }, function (err) {
            throw err;
          });
        } else if (data.type === 'answer') {
          peer.conn.setAnswer(data, function () {
          }, function (err) {
            throw err;
          });
        }
      };

      var _handleIce = function (peer, data) {
        peer.conn.addIceCandidate(data, function () {
        }, function (err) {
          throw err;
        });
      };

      var onSdp = function (from, data) {
        var peer = null;

        for (var pi = 0, pl = _peers.length; pi < pl; ++pi) {
          if (_peers[pi].id === from) {
            peer = _peers[pi];
            break;
          }
        }

        if (peer === null) {
          return;
        }

        console.log('[' + _url + '] ' + 'SDP received from ' + peer.id);
        if (data.hasOwnProperty('type') && data.hasOwnProperty('sdp')) {
          _handleSdp(peer, data);
        } else if (data.hasOwnProperty('candidate') &&
          data.hasOwnProperty('sdpMid') &&
          data.hasOwnProperty('sdpMLineIndex')) {
          _handleIce(peer, data);
        }
      };

      return {
        onEnter: onEnter,
        onLeave: onLeave,
        onSdp: onSdp
      };
    };

    var _trackerObserver = function (url) {
      var _url = url;

      var onConnect = function (id) {
        console.log('[' + _url + '] ' + 'tracker connected');
        _trackers[_url].announce(_metadata.getId(), _got, new _announceObserver(_url));
      };

      var onDisconnect = function (evt) {
        console.log('[' + _url + '] ' + 'tracker disconnected', evt);
      };

      return {
        onConnect: onConnect,
        onDisconnect: onDisconnect
      };
    };

    var _generateGot = function () {
      var gotIndex = 0;
      var currentGot = 0;

      _got = [];
      for (var i = 0, l = _clusters.length; i < l; ++i) {
        if (_clusters[i] === true) {
          currentGot += (1 << gotIndex);
        }
        if (++gotIndex === 32) {
          gotIndex = 0;
          _got.push(currentGot);
          currentGot = 0;
        }
      }

      if (gotIndex > 0 && gotIndex < 32) {
        _got.push(currentGot);
      }
    };

    var check = function (index, bytes) {
      //var result = _metadata.validateMediaSegment(index, bytes);
      var result = true;
      _clusters[index] = result;
      return result;
    };

    var start = function (sendCb) {
      _sendCb = sendCb;
      _generateGot();

      for (var url in _trackers) {
        _trackers[url].connect(url);
      }
    };

    var _constructor = function () {
      var cues = _metadata.cues;
      for (var si = 0, sl = cues.length; si < sl; ++si) {
        _clusters.push(false);
      }

      var trackers = _metadata.trackers;
      for (var ti = 0, tl = trackers.length; ti < tl; ++ti) {
        if ((trackers[ti] in _trackers)) {
          continue;
        }

        var url = trackers[ti];
        var tracker = new Tracker();
        tracker.subscribe(new _trackerObserver(url));
        _trackers[url] = tracker;
      }
    };

    _constructor();

    return {
      check: check,
      start: start,
      retrieveCluster: retrieveCluster
    };
  }*/

  global.Node = Node;
})(Peeracle || this);
