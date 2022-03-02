const { PacketTypes } = require("@static/globals.js");

const { encode, _packetize } = require("./encode.js");
const decode = require("./decode.js");

class PacketTool {
  constructor(packetFormat, packetID = null, packetType) {
    // console.log(...arguments);

    if (!(packetFormat instanceof Array)) {
      throw new Error("Packet format must be an array");
    }

    if (!packetFormat.every(item => {
      if (typeof item !== "object") {
        return false;
      }

      try {
        item.getOnlyKey();
      } catch (e) {
        return false;
      }

      return true;
    })) {
      throw new Error(`Packet format is not of type {"key": DT}[]`);
    }

    if (!Object.keys(PacketTypes).map(key => PacketTypes[key]).includes(packetType)) {
      throw new Error("packetType must be a member of PacketTypes");
    }

    switch (packetType) {
      case PacketTypes.Raknet:
        if (typeof packetID !== "number" ||
            packetID < 0                 ||
            packetID > 255
        ) {
          throw new Error("packetID must be a number between 0-255");
        }

        break;

      case PacketTypes.Java:
        if (typeof packetID !== "number") {
          throw new Error("packetID must be a number");
        }

        break;
    }

    this.packetID     = packetID;
    this.packetFormat = packetFormat;
    this.packetType   = packetType;
  }

  encode = encode;
  _packetize = _packetize;

  decode = decode;
}

module.exports = PacketTool;
