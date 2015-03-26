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
  var http = require('http');
  var WebSocketServer = require('websocket').server;

  function Server() {
    var _id = 0;
    var _server;
    var _wsServer;
    var _hashes = {};

    var listen = function (port) {
      _server = http.createServer(function (request, response) {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
      }).listen(port, function () {
        console.log((new Date()) + ' Server is listening on port 8080');
      });

      _wsServer = new WebSocketServer({
        httpServer: _server,
        autoAcceptConnections: false
      });

      function originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        console.log('origin:', origin);
        return true;
      }

      _wsServer.on('request', function (request) {
        if (!originIsAllowed(request.origin)) {
          // Make sure we only accept requests from an allowed origin
          request.reject();
          console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
          return;
        }

        var connection = request.accept('prcl', request.origin);
        console.log((new Date()), 'Peer ' + connection.remoteAddress + ' Connection accepted.');


        var hello = function (msg) {
          console.log('hello packet received');
          connection.id = ++_id;
          connection.sendUTF(JSON.stringify({type: 'welcome', id: connection.id}), function (err) {
            if (err) {
              console.error('Tracker send error:', err);
            }
          });
        };

        var announce = function (msg) {
          if (!msg.hash || !msg.got) {
            return;
          }

          if (!_hashes[msg.hash]) {
            _hashes[msg.hash] = {};
          }

          if (!_hashes[msg.hash][connection.id]) {
            _hashes[msg.hash][connection.id] = msg.got;
          }

          var peers = [];
          for (var connid in _hashes[msg.hash]) {
            connid = parseInt(connid);
            if (connid === connection.id) {
              continue;
            }
            peers.push({id: connid, got: _hashes[msg.hash][connid]});
            for (var c = 0; c < _wsServer.connections.length; ++c) {
              if (_wsServer.connections[c].id === connid) {
                _wsServer.connections[c].sendUTF(JSON.stringify({
                  type: 'enter',
                  hash: msg.hash,
                  peers: [{
                    id: connection.id,
                    got: msg.got
                  }]
                }));
              }
            }
          }

          if (peers.length) {
            connection.sendUTF(JSON.stringify({
              type: 'enter',
              hash: msg.hash,
              peers: peers
            }));
          }
        };

        var remove = function (msg) {
          console.log('remove packet received');
          if (!msg.hash || (!_hashes[msg.hash] || !_hashes[msg.hash][connection.id])) {
            return;
          }

          console.log('deleting hash connection', msg.hash);
          delete _hashes[msg.hash][connection.id];

          var size = 0;
          for (var conn in _hashes[msg.hash]) {
            if (_hashes[msg.hash].hasOwnProperty(conn)) {
              size = 1;
              break;
            }
          }

          if (!size) {
            console.log('deleting hash', msg.hash);
            delete _hashes[msg.hash];
            return;
          }

          for (var connid in _hashes[msg.hash]) {
            connid = parseInt(connid);
            for (var c = 0; c < _wsServer.connections.length; ++c) {
              if (_wsServer.connections[c].id === connid) {
                _wsServer.connections[c].sendUTF(JSON.stringify({
                  type: 'leave',
                  hash: msg.hash,
                  id: connection.id
                }));
              }
            }
          }
        };

        var sdp = function (msg) {
          if (!msg.data || !msg.hash || !msg.peer || !_hashes[msg.hash] || !_hashes[msg.hash][msg.peer]) {
            return;
          }

          for (var c = 0; c < _wsServer.connections.length; ++c) {
            if (_wsServer.connections[c].id === parseInt(msg.peer)) {
              _wsServer.connections[c].sendUTF(JSON.stringify({
                type: 'sdp',
                hash: msg.hash,
                from: connection.id,
                data: msg.data
              }));
              break;
            }
          }
        };

        var messageHandlers = {
          hello: hello,
          announce: announce,
          remove: remove,
          sdp: sdp
        };

        connection.on('message', function (message) {
          if (message.type === 'utf8') {
            var jmessage;

            try {
              jmessage = JSON.parse(message.utf8Data);
            } catch (e) {
              return;
            }

            if (jmessage.type && messageHandlers[jmessage.type]) {
              messageHandlers[jmessage.type](jmessage);
            }
          }
        });
        connection.on('close', function (reasonCode, description) {
          console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
          for (var hash in _hashes) {
            var c;
            for (c in _hashes[hash]) {
              if (parseInt(c) === connection.id) {
                console.log('deleting hash connection', hash);
                delete _hashes[hash][c];
                break;
              }
            }

            var size = 0;
            for (c in _hashes[hash]) {
              if (_hashes[hash].hasOwnProperty(c)) {
                size = 1;
                break;
              }
            }

            if (!size) {
              console.log('deleting hash', hash);
              delete _hashes[hash];
              continue;
            }

            for (c in _hashes[hash]) {
              for (var i = 0; i < _wsServer.connections.length; ++i) {
                if (_wsServer.connections[i].id === parseInt(c)) {
                  _wsServer.connections[i].sendUTF(JSON.stringify({
                    type: 'leave',
                    hash: hash,
                    id: connection.id,
                    got: _hashes[hash][c].got
                  }));
                }
              }
            }
          }
        });
      });
    };

    var close = function () {
      _wsServer.shutDown();
    };

    return {
      listen: listen,
      close: close
    };
  }

  module.exports = Server;
})();
