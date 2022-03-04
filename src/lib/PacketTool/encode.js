const {
  DataTypes: DT,
  PacketTypes,
  LEGACY_MAGIC,
  RAKNET_MAGIC
} = require("@static/globals.js");

const varint = require("varint");

const { show_hexy } = require("@lib/helpers.js");

function assertOrThrow(key, type, error, ...assertions) {
  if (!assertions.every(assertion => assertion)) {
    throw new Error(`Key "${key}" of type ${DT.getByValue(type)} expects value to be ${error}`);
  }
}

function encode(object) {
  if (typeof object !== "object") {
    throw new Error("PacketTool.encode takes an object as argument");
  }

  if (object instanceof Array) {
    throw new Error("PacketTool.encode does not take an array, simply an object");
  }

  let missingKey = this.packetFormat.map(item => item.getOnlyKey()).find(key => !(key in object));
  if (missingKey) {
    throw new Error(`Object is missing key ${missingKey} in packet format`);
  }

  const buffers = [];

  for (const item of this.packetFormat) {
    const key = item.getOnlyKey();
    const value = object[key];
    const datatype = item[key];

    // console.log("encode", DT.getByValue(datatype), key, '=', [ value ]);

    try {
      switch (datatype) {
        case DT.UByte:
          assertOrThrow(
            key, datatype, "a whole number between 0 and 255",
            typeof value === "number",
            value >= 0,
            value <= 255,
            value % 1 === 0
          );

          buffers.push(Buffer.from([ value ]));

          break;

        case DT.UShortLE: {
          assertOrThrow(
            key, datatype, "a whole number between 0 and 65535",
            typeof value === "number",
            value >= 0,
            value <= 65535,
            value % 1 === 0
          );

          const buffer = Buffer.alloc(2);

          buffer.writeUInt16LE(value);
          buffers.push(buffer);
        } break;

        case DT.Int32BE: {
          assertOrThrow(
            key, datatype, "a whole number between -2147483648 and 2147483647",
            typeof value === "number",
            value >=  (1 << 31),
            value <= ~(1 << 31),
            value % 1 === 0
          );

          const buffer = Buffer.alloc(4);

          buffer.writeInt32BE(value);
          buffers.push(buffer);
        } break;

        case DT.Int64BE: {
          assertOrThrow(
            key, datatype, "a whole number between -9223372036854775808 and 9223372036854775807",
            typeof value === "bigint",
            value >= -(2n ** 63n) + 1n,
            value <=  (2n ** 63n),
            value % 1n === 0n
          );

          const buffer = Buffer.alloc(8);

          buffer.writeBigInt64BE(value);
          buffers.push(buffer);

        } break;

      case DT.VarInt: {
        assertOrThrow(
          key, datatype, "an integer",
          ["number", "bigint"].includes(typeof value),
          value % 1 === 0,
        );

        const buffer = Buffer.from(varint.encode(value));

        buffers.push(buffer);

      } break;
        case DT.LEGACY_MAGIC:
          assertOrThrow(
            key, datatype, "null",
            value === null
          );

          buffers.push(LEGACY_MAGIC);
        break;

        case DT.RAKNET_MAGIC:
          assertOrThrow(
            key, datatype, "null",
            value === null
          );

          buffers.push(RAKNET_MAGIC);

        break;

        case DT.FixedByteArray:
          assertOrThrow(
            key, datatype, "of type Buffer",
            value instanceof Buffer
          );

          buffers.push(value);
        break;

        case DT.VarIntString: {
          assertOrThrow(
            key, datatype, "of type string",
            typeof value === "string"
          );

          const strBuffer = Buffer.from(value);
          const lenBuffer = Buffer.from(varint.encode(strBuffer.length));

          buffers.push(lenBuffer, strBuffer);
        } break;

        default:
          throw new Error(`Invalid data type value processed: ${DT.getByValue(datatype)}`);
      }
    } catch (e) {
      console.error("While encoding", [value], `as ${DT.getByValue(datatype)}:`);

      throw e;
    }

    // show_hexy(buffers[buffers.length - 1], '>');
  }

  return this._packetize(buffers);
}

function _packetize(buffers) {
  switch (this.packetType) {
    case PacketTypes.Raknet: {
      const buffer = Buffer.alloc(1);
      buffer.writeUInt8(this.packetID);

      return Buffer.concat([ buffer, ...buffers ]);
    } break;

    case PacketTypes.Java: {
      const packetIDBuffer = Buffer.from(varint.encode(this.packetID));

      const payloadBuffer = Buffer.concat([ packetIDBuffer, ...buffers ]);
      const lengthBuffer = Buffer.from(varint.encode(payloadBuffer.length));

      return Buffer.concat([ lengthBuffer, payloadBuffer ]);
    } break;

    case PacketTypes.Raw:
      return Buffer.concat(buffers);

    default:
      throw new Error(`Invalid packet type processed: ${PacketTypes.getByValue(this.packetType)}`);
  }
}

module.exports = {
  encode,
  _packetize
};
