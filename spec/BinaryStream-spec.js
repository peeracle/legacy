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

if (typeof Peeracle === 'undefined') {
  var Peeracle = require('../index');
}

describe('Peeracle.BinaryStream', function () {
  var buffer;
  var binaryStream;

  beforeEach(function () {
    buffer = new Uint8Array(32);
    binaryStream = new Peeracle.BinaryStream(buffer);
  });

  describe('construct', function () {
    it('should initialize', function () {
      expect(function () {
        var buf = new Uint8Array(1);
        var bs = new Peeracle.BinaryStream(buf);
      }).not.toThrow();
    });
    it('should throw error', function () {
      expect(function () {
        var buf = null;
        var bs = new Peeracle.BinaryStream(buf);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });
  });

  describe('seek', function () {
    it('should throw an error for seeking outside the stream', function () {
      expect(function () {
        var position = Peeracle.Utils.trunc(Math.random() * 0x7FFFFFFF + 64);
        binaryStream.seek(position);
      }).toThrowError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
      expect(function () {
        var position = Peeracle.Utils.trunc(Math.random() * -0x7FFFFFFF + -64);
        binaryStream.seek(position);
      }).toThrowError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    });

    it('should throw an error for seeking with an invalid argument', function () {
      expect(function () {
        binaryStream.seek('');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.seek(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.seek(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.seek([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.seek(new Uint8Array(1));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });
  });

  describe('byte', function () {
    it('should write and read a random byte', function () {
      var byte = Peeracle.Utils.trunc(Math.random() * 255);
      binaryStream.writeByte(byte);
      binaryStream.seek(0);
      var result = binaryStream.readByte();
      expect(result).toEqual(byte);
    });

    it('should throw an error for writing a byte with an invalid argument', function () {
      expect(function () {
        binaryStream.writeByte('');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeByte(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeByte(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeByte([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeByte(new Uint8Array(1));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });

    it('should throw an error for reading outside the stream', function () {
      expect(function () {
        binaryStream.seek(32);
        binaryStream.readByte();
      }).toThrowError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    });

    it('should read a zero', function () {
      var result = binaryStream.readByte();
      expect(result).toEqual(0);
    });
  });

  describe('bytes', function () {
    it('should write and read some random bytes', function () {
      var result;
      var length = Peeracle.Utils.trunc(Math.random() * 30 + 1);
      var bytes = new Uint8Array(length);

      for (var i = 0; i < length; ++i) {
        bytes[i] = Peeracle.Utils.trunc(Math.random() * 255);
      }

      binaryStream.writeBytes(bytes);
      binaryStream.seek(0);
      result = binaryStream.readBytes(length);
      expect(result).toEqual(bytes);
    });

    it('should throw an error for reading bytes with an invalid argument', function () {
      expect(function () {
        binaryStream.readBytes('');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.readBytes(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.readBytes(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.readBytes([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.readBytes(new Uint8Array(1));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeBytes('');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeBytes(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeBytes(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeBytes([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });

    it('should throw an error for reading more bytes than it should have', function () {
      expect(function () {
        var position = Peeracle.Utils.trunc(Math.random() * 0x7FFFFFFF + 64);
        binaryStream.readBytes(position);
      }).toThrowError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
      expect(function () {
        var position = Peeracle.Utils.trunc(Math.random() * -0x7FFFFFFF + -64);
        binaryStream.readBytes(position);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.seek(32);
        binaryStream.readBytes(1);
      }).toThrowError(Peeracle.BinaryStream.ERR_INDEX_OUT_OF_BOUNDS);
    });
  });

  describe('string', function () {
    it('should write and read a random string', function () {
      var result;
      var string = Math.random().toString(36).slice(2, 16);

      binaryStream.writeString(string);

      binaryStream.seek(0);
      result = binaryStream.readString();
      expect(result).toEqual(string);

      binaryStream.seek(0);
      result = binaryStream.readString(2);
      expect(result).toEqual(string.slice(0, 2));

      binaryStream.seek(0);
      result = binaryStream.readString(4);
      expect(result).toEqual(string.slice(0, 4));

      binaryStream.seek(4);
      result = binaryStream.readString(6);
      expect(result).toEqual(string.slice(4, 10));
    });

    it('should write and read an empty string', function () {
      var result;

      binaryStream.writeString('');
      binaryStream.seek(0);
      result = binaryStream.readString();
      expect(result).toEqual('');

      binaryStream.writeString(null);
      binaryStream.seek(0);
      result = binaryStream.readString();
      expect(result).toEqual('');

      binaryStream.writeString(0);
      binaryStream.seek(0);
      result = binaryStream.readString();
      expect(result).toEqual('');

      binaryStream.writeString(undefined);
      binaryStream.seek(0);
      result = binaryStream.readString();
      expect(result).toEqual('');
    });
  });

  describe('unsigned integer', function () {
    it('should write and read a random unsigned integer', function () {
      var result;
      var value = Math.floor((Math.random() * 0xFFFFFFFF - 0x7FFFFFFF + 1) +
        0x7FFFFFFF);

      binaryStream.writeUInt32(value);

      binaryStream.seek(0);
      result = binaryStream.readUInt32();

      expect(result).toEqual(value);
    });

    it('should throw an error for invalid unsigned integer', function () {
      expect(function () {
        binaryStream.writeUInt32('hey');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeUInt32(false);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeUInt32(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeUInt32(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeUInt32([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeUInt32(new Uint8Array([2, 3, 4]));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });
  });

  describe('signed integer', function () {
    it('should write and read the random signed integer', function () {
      var result;
      var value = Math.floor(Math.random() * 0x7FFFFFFF);

      binaryStream.writeInt32(value);
      binaryStream.seek(0);
      result = binaryStream.readInt32();
      expect(result).toEqual(value);
    });

    it('should throw an error for invalid signed integer', function () {
      expect(function () {
        binaryStream.writeInt32('hey');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeInt32(false);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeInt32(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeInt32(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeInt32([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeInt32(new Uint8Array([2, 3, 4]));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });
  });

  describe('double', function () {
    it('should write and read a positive random double', function () {
      var result;
      var value = Math.random() * 0x7FFFFFFF;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should write and read a negative random double', function () {
      var result;
      var value = Math.random() * -0x7FFFFFFF + -0x7F;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should write and read a positive infinite double', function () {
      var result;
      var value = Number.POSITIVE_INFINITY;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should write and read a negative infinite double', function () {
      var result;
      var value = Number.NEGATIVE_INFINITY;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should write and read a positive zero double', function () {
      var result;
      var value = +0.0;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should write and read a negative zero double', function () {
      var result;
      var value = -0.0;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should write and read a NaN double', function () {
      var result;
      var value = Number.NaN;

      binaryStream.writeFloat8(value);
      binaryStream.seek(0);
      result = binaryStream.readFloat8();
      expect(result).toEqual(value);
    });

    it('should throw an error for reading a double with an invalid argument', function () {
      expect(function () {
        binaryStream.writeFloat8('');
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeFloat8(null);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeFloat8(undefined);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeFloat8([]);
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
      expect(function () {
        binaryStream.writeFloat8(new Uint8Array(1));
      }).toThrowError(Peeracle.BinaryStream.ERR_INVALID_ARGUMENT);
    });
  });
});