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

/* eslint-disable */
'use strict';

var url;
var length;
var bytes;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

if (typeof Peeracle === 'undefined') {
  var Peeracle = require('../index');
  var http = require('http');
  var i;

  url = 'http://127.0.0.1:9990/';
  length = Math.floor(Math.random() * 128 - 32 + 1) + 32;
  bytes = new Uint8Array(length);

  for (i = 0; i < length; ++i) {
    bytes[i] = Math.floor(Math.random() * 255);
  }

  http.createServer(function (request, response) {
    if (request.url !== '/') {
      response.writeHead(404);
      response.end();
      return;
    }

    if (request.method === 'GET') {
      var rangeStr = request.headers['range'];
      var range = rangeStr.substr(6, rangeStr.length - 6);
      var min = parseInt(range.split('-')[0]);
      var max = parseInt(range.split('-')[1]) + 1;
      var result = bytes.subarray(min, max);

      response.writeHead(206, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': max - min,
        'Content-Range': 'bytes ' + range + '/' + length
      });

      response.write(new Buffer(result));
      response.end();
    } else if (request.method === 'HEAD') {
      response.writeHead(200, {'Content-Length': length});
      response.end();
    }
  }).listen(9990);
} else {
  url = 'http://out.dotstar.fr/media/dash/' +
    'tears_of_steel_video_160x72_250K.webm';
  bytes = new Uint8Array([26, 69, 223, 163, 159, 66, 134, 129, 1,
    66, 247, 129, 1, 66, 242, 129, 4, 66, 243, 129,
    8, 66, 130, 132, 119, 101, 98, 109, 66, 135, 129,
    2, 66]);
  length = 19993725;
}

describe('Peeracle.DataSource.Http', function () {
  var http;

  beforeEach(function () {
    http = new Peeracle.DataSource.Http(url);
  });

  describe('constructor', function () {
    it('should throw an error on invalid first argument', function () {
      var err = 'first argument must be a string';
      expect(function () {
        new Peeracle.DataSource.Http(undefined);
      }).toThrowError(err);
      expect(function () {
        new Peeracle.DataSource.Http(0);
      }).toThrowError(err);
      expect(function () {
        new Peeracle.DataSource.Http([]);
      }).toThrowError(err);
      expect(function () {
        new Peeracle.DataSource.Http(null);
      }).toThrowError(err);
      expect(function () {
        new Peeracle.DataSource.Http(new Uint8Array(2));
      }).toThrowError(err);
    });
  });

  describe('read', function () {
    it('should read one byte', function () {
      var before = http.offset;
      http.read(1);
      expect(http.offset).toEqual(before + 1);
    });
    it('should read two bytes', function () {
      var before = http.offset;
      http.read(2);
      expect(http.offset).toEqual(before + 2);
    });
    it('should read random bytes', function () {
      var before = http.offset;
      var position = Math.floor(Math.random() * length - 16 + 1) + 16;
      http.read(position);
      expect(http.offset).toEqual(before + position);
    });
    it('should throw invalid argument exception', function () {
      var err = 'Invalid argument, expected number';
      expect(function () {
        http.read([]);
      }).toThrowError(err);
      expect(function () {
        http.read(new Uint8Array(2));
      }).toThrowError(err);
      expect(function () {
        http.read('hey');
      }).toThrowError(err);
    });
    it('should throw value out of bounds exception', function () {
      var err = 'Value out of bounds';
      expect(function () {
        http.read(-1);
      }).toThrowError(err);
    });
  });

  describe('seek', function () {
    it('should seek at one', function () {
      http.seek(1);
      expect(http.offset).toEqual(1);
    });
    it('should seek at two', function () {
      http.seek(2);
      expect(http.offset).toEqual(2);
    });
    it('should seek at random', function () {
      var position = Math.floor(Math.random() * (length - 16 + 1)) + 16;
      http.seek(position);
      expect(http.offset).toEqual(position);
    });
    it('should throw invalid argument exception', function () {
      var err = 'Invalid argument, expected number';
      expect(function () {
        http.seek([]);
      }).toThrowError(err);
      expect(function () {
        http.seek(new Uint8Array(2));
      }).toThrowError(err);
      expect(function () {
        http.seek('hey');
      }).toThrowError(err);
    });
    it('should throw value out of bounds exception', function () {
      var err = 'Value out of bounds';
      expect(function () {
        http.seek(-1);
      }).toThrowError(err);
    });
  });

  describe('fetchBytes', function () {
    it('should fetch some bytes', function (done) {
      http.fetchBytes(1, function (result) {
        expect(result).not.toBeNull();
        expect(result).toEqual(jasmine.any(Uint8Array));
        expect(result[0]).toEqual(bytes[0]);
        expect(http.length).toEqual(length);
        done();
      });
    });
    it('should fetch the next two bytes', function (done) {
      http.read(1);
      http.fetchBytes(2, function (result) {
        expect(result).not.toBeNull();
        expect(result).toEqual(jasmine.any(Uint8Array));
        expect(result[0]).toEqual(bytes[1]);
        expect(result[1]).toEqual(bytes[2]);
        expect(http.length).toEqual(length);
        done();
      });
    });
    it('should fetch some next random bytes', function (done) {
      var flen = Math.floor(Math.random() * (bytes.length + 16 + 1));
      var sub = bytes.subarray(3, 3 + flen);
      http.read(3);
      http.fetchBytes(flen, function (result) {
        expect(result).not.toBeNull();
        expect(result.length).toEqual(flen);
        expect(result).toEqual(sub);
        expect(http.length).toEqual(length);
        done();
      });
    });
    it('should fetch null bytes', function (done) {
      http = new Peeracle.DataSource.Http(url + 'invalidstuff');
      http.fetchBytes(1, function (result) {
        expect(result).toBeNull();
        expect(http.length).toEqual(-1);
        done();
      });
    });
    it('should throw invalid first argument exception', function () {
      var erra = 'first argument must be a number';
      var errb = 'first argument must be greater than zero';
      expect(function () {
        http.fetchBytes(null, null);
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes([], null);
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(new Uint8Array(2), null);
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes('hey', function (bytes) {
        });
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(null, function (bytes) {
        });
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes([], function (bytes) {
        });
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(new Uint8Array(2), function (bytes) {
        });
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes('hey', function (bytes) {
        });
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(-10, function (bytes) {
        });
      }).toThrowError(errb);
    });
    it('should throw invalid first argument exception', function () {
      var erra = 'second argument must be a callback';
      expect(function () {
        http.fetchBytes(1, 'hey');
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(2, null);
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(3, []);
      }).toThrowError(erra);
      expect(function () {
        http.fetchBytes(3, new Uint8Array(2));
      }).toThrowError(erra);
    });
  });
});