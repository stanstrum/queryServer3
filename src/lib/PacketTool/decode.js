const {
  DataTypes: DT,
  PacketTypes,
  LEGACY_MAGIC,
  RAKNET_MAGIC
} = require("@static/globals.js");

const varint = require("varint");

const { show_hexy } = require("@lib/helpers.js");

function decode(buffer, fixedByteLengths = []) {
  // console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@");
  // console.log("decode", ...arguments);
  // console.log("decode", buffer instanceof Buffer);

  if (!(buffer instanceof Buffer)) {
    throw new Error("Argument must be a buffer");
  }

  if (!(fixedByteLengths instanceof Array) || fixedByteLengths.find(el => typeof el !== "number")) {
    throw new Error("fixedByteLengths must be of type number[]");
  }

  let offset = 0;
  switch (this.packetType) {
    case PacketTypes.Raknet: {
      const packetID = buffer.readInt8();
      offset += 1;

      if (packetID !== this.packetID) {
        throw new Error(`Raknet Packet ID mismatch: read 0x${packetID.toString(16)}, expected 0x${this.packetID.toString(16)}`);
      }

    } break;

    case PacketTypes.Java: {
      const packetLength = varint.decode(buffer);
      offset += varint.decode.bytes;

      const packetID = varint.decode(buffer, offset);
      offset += varint.decode.bytes;

      if (this.packetID !== packetID) {
        throw new Error(`Java Packet ID mismatch: read 0x${packetID.toString(16)}, expected 0x${this.packetID.toString(16)}`);
      }
    } break;

    case PacketTypes.Raw: break;

    default:
      throw new Error(`Invalid packet type decoded: ${PacketTypes.getByValue(this.packetType)}`);
  }

  const returnObject = {};

  for (const item of this.packetFormat) {
    const key = item.getOnlyKey();
    const datatype = item[key];

    const oldOffset = offset;
    switch (datatype) {
      case DT.UByte:
        returnObject[key] = buffer.readUInt8(offset);
        offset += 1;

        break;

      case DT.UShortLE:
        returnObject[key] = buffer.readUint16LE(offset);
        offset += 2;

        break;

      case DT.Int32BE:
        returnObject[key] = buffer.readInt32BE(offset);
        offset += 4;

        break;

      case DT.Int64BE:
        returnObject[key] = buffer.readBigInt64BE(offset);
        offset += 8;

        break;

      case DT.FixedByteArray: {
        if (fixedByteLengths.length === 0) {
          throw new Error(`Key ${key} of type FixedByteArray required a fixed byte length to be in the fixedByteLengths array`);
        }

        const bytes = fixedByteLengths.shift();

        returnObject[key] = buffer.slice(offset, offset + bytes);
        offset += bytes;
      } break;

      case DT.RAKNET_MAGIC: {
        const magic = buffer.slice(offset, offset + RAKNET_MAGIC.length);

        if (magic.length !== RAKNET_MAGIC.length) {
          throw new Error("Failed to read MAGIC string, ran out of bytes");
        }

        if (magic.compare(RAKNET_MAGIC) !== 0) {
          throw new Error("Read MAGIC item, value is not equal to MAGIC value: " + magic.toString());
        }

        returnObject[key] = magic;

        offset += 16;

      } break;

      case DT.NullTerminatedString: {
        let bytes;
        for (bytes = 0; buffer[offset + bytes] != 0x00 && offset + bytes < buffer.length; bytes++);

        returnObject[key] = buffer.slice(offset, offset + bytes).toString("utf-8");
        offset += bytes + 1;

        if (buffer[offset] === 0x00) {
          offset++;
        }

      } break;

      case DT.NullTerminatedStringArray: {
        const stringArray = [];
        do {
          let bytes;
          for (bytes = 0; buffer[offset + bytes] != 0x00 && offset + bytes < buffer.length; bytes++);

          stringArray.push(buffer.slice(offset, offset + bytes).toString("utf-8"));
          offset += bytes + 1;
        } while (stringArray[stringArray.length - 1] || stringArray[stringArray.length - 2] === "plugins");

        if (buffer[offset] === 0x00) {
          offset++;
        }

        returnObject[key] = stringArray.slice(0, -1);

      } break;

      case DT.UShortString: {
        const length = buffer.readUInt16BE(offset);
        offset += 2;

        const bytes = buffer.slice(offset, offset + length)
        const string = bytes.toString("utf-8");
        offset += length;

        if (bytes.length !== length) {
          throw new Error(`Failed to read string, ran out of bytes (read: ${bytes.length}, expected: ${length})`);
        }

        returnObject[key] = string;

      } break;

      case DT.VarIntString: {
        // I have literally zero clue why I need to subtract three.
        // I have literally zero clue why ... anything?
        const length = varint.decode(buffer) - (varint.decode.bytes + 1);
        // show_hexy(buffer.slice(offset, offset + varint.decode.bytes), '~');
        offset += varint.decode.bytes;

        // show_hexy(buffer.slice(offset), '!');

        const bytes = buffer.slice(offset, offset + length);
        const string = bytes.toString("utf-8");
        offset += length;

        if (bytes.length !== length) {
          console.log(`Failed to read string, ran out of bytes (read: ${bytes.length}, expected: ${length})`);
        }

        returnObject[key] = string;

      } break;

      default:
        throw new Error(`Invalid data type value processed: ${DT.getByValue(datatype)}`);
    }

    // if (offset == oldOffset) console.log("Offset was not changed");
    // console.log("decode", DT.getByValue(datatype), key, '=', [ returnObject[key] ]);
    // show_hexy(buffer.slice(oldOffset, offset), 'decode');
  }

  if (buffer.length !== offset) {
    const message = `Buffer offset mismatch: length=${buffer.length}, offset=${offset}`;

    throw new Error(message);
  }

  return returnObject;
}

module.exports = decode;
