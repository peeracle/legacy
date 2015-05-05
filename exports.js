window.Peeracle = Peeracle;

Peeracle['BinaryStream'] = BinaryStream;
BinaryStream['ERR_INDEX_OUT_OF_BOUNDS'] = BinaryStream.ERR_INDEX_OUT_OF_BOUNDS;
BinaryStream.prototype['readByte'] = BinaryStream.prototype.readByte;
BinaryStream.prototype['writeByte'] = BinaryStream.prototype.writeByte;
BinaryStream.prototype['readBytes'] = BinaryStream.prototype.readBytes;
BinaryStream.prototype['writeBytes'] = BinaryStream.prototype.writeBytes;
BinaryStream.prototype['readFloat8'] = BinaryStream.prototype.readFloat8;
BinaryStream.prototype['writeFloat8'] = BinaryStream.prototype.writeFloat8;
BinaryStream.prototype['readInt32'] = BinaryStream.prototype.readInt32;
BinaryStream.prototype['writeInt32'] = BinaryStream.prototype.writeInt32;
BinaryStream.prototype['readUInt32'] = BinaryStream.prototype.readUInt32;
BinaryStream.prototype['writeUInt32'] = BinaryStream.prototype.writeUInt32;
BinaryStream.prototype['readString'] = BinaryStream.prototype.readString;
BinaryStream.prototype['writeString'] = BinaryStream.prototype.writeString;
BinaryStream.prototype['seek'] = BinaryStream.prototype.seek;

Peeracle['Crypto'] = Crypto;
Crypto['createInstance'] = Crypto.createInstance;
Crypto.prototype['checksum'] = Crypto.prototype.checksum;
Crypto.prototype['init'] = Crypto.prototype.init;
Crypto.prototype['update'] = Crypto.prototype.update;
Crypto.prototype['finish'] = Crypto.prototype.finish;
Crypto.prototype['serialize'] = Crypto.prototype.serialize;
Crypto.prototype['unserialize'] = Crypto.prototype.unserialize;

Peeracle['Crypto']['Crc32'] = Crc32;
Crc32['IDENTIFIER'] = Crc32.IDENTIFIER;
Crc32.prototype['checksum'] = Crc32.prototype.checksum;
Crc32.prototype['init'] = Crc32.prototype.init;
Crc32.prototype['update'] = Crc32.prototype.update;
Crc32.prototype['finish'] = Crc32.prototype.finish;
Crc32.prototype['serialize'] = Crc32.prototype.serialize;
Crc32.prototype['unserialize'] = Crc32.prototype.unserialize;

Peeracle['DataSource'] = DataSource;

Peeracle['DataSource']['File'] = File;
File.prototype['read'] = File.prototype.read;
File.prototype['seek'] = File.prototype.seek;
File.prototype['fetchBytes'] = File.prototype.fetchBytes;

Peeracle['DataSource']['Http'] = Http;
Http.prototype['read'] = Http.prototype.read;
Http.prototype['seek'] = Http.prototype.seek;
Http.prototype['fetchBytes'] = Http.prototype.fetchBytes;

Peeracle['Listenable'] = Listenable;
Listenable.prototype['on'] = Listenable.prototype.on;
Listenable.prototype['once'] = Listenable.prototype.once;
Listenable.prototype['off'] = Listenable.prototype.off;
Listenable.prototype['emit'] = Listenable.prototype.emit;

Peeracle['Media'] = Media;
Media['createInstance'] = Media.createInstance;
Media.prototype['getInitSegment'] = Media.prototype.getInitSegment;
Media.prototype['getMediaSegment'] = Media.prototype.getMediaSegment;

Peeracle['Media']['WebM'] = WebM;
WebM['ERR_INVALID_WEBM'] = WebM.ERR_INVALID_WEBM;
WebM['ERR_EMPTY_WEBM'] = WebM.ERR_EMPTY_WEBM;
WebM['checkHeader'] = WebM.checkHeader;
WebM.prototype['getInitSegment'] = WebM.prototype.getInitSegment;
WebM.prototype['getMediaSegment'] = WebM.prototype.getMediaSegment;

Peeracle['Metadata'] = Metadata;
Metadata.prototype['getId'] = Metadata.prototype.getId;
Metadata.prototype['calculateChunkSize'] = Metadata.prototype.calculateChunkSize;
Metadata.prototype['addStream'] = Metadata.prototype.addStream;

Peeracle['MetadataSerializer'] = MetadataSerializer;
MetadataSerializer.prototype['serialize'] = MetadataSerializer.prototype.serialize;

Peeracle['MetadataUnserializer'] = MetadataUnserializer;
MetadataUnserializer.prototype['unserialize'] = MetadataUnserializer.prototype.unserialize;

Peeracle['PeerConnection'] = PeerConnection;

Peeracle['Tracker'] = Tracker;
Peeracle['Tracker']['Client'] = Client;
Client.prototype['connect'] = Client.prototype.connect;

Peeracle['Tracker']['Message'] = Message;
Peeracle['Tracker']['Message']['Type'] = Message.Type;
Peeracle['Tracker']['Message']['Type']['None'] = Message.Type.None;
Peeracle['Tracker']['Message']['Type']['Hello'] = Message.Type.Hello;
Peeracle['Tracker']['Message']['Type']['Welcome'] = Message.Type.Welcome;

Peeracle['Utils'] = Utils;
Utils['trunc'] = Utils.trunc;

window['Peeracle'] = Peeracle;
