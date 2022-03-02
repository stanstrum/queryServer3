const { auto } = require("@lib/helpers.js");

const DataTypes = {
  UByte                    : auto(),
  UShortLE                 : auto(),
  Int32BE                  : auto(),
  Int64BE                  : auto(),
  VarInt                   : auto(),
  UShortString             : auto(),
  VarIntString             : auto(),
  NullTerminatedString     : auto(),
  NullTerminatedStringArray: auto(),
  FixedByteArray           : auto(),
  RAKNET_MAGIC             : auto(),
  LEGACY_MAGIC             : auto()
};

const PacketTypes = {
  Raw   : auto(),
  Java  : auto(),
  Raknet: auto()
};

const RAKNET_MAGIC = "00ffff00fefefefefdfdfdfd12345678".hexToBuffer();
const LEGACY_MAGIC = "fefd".hexToBuffer();

class ConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConnectionError";
  }
}

module.exports = {
  DataTypes,
  PacketTypes,
  RAKNET_MAGIC,
  LEGACY_MAGIC,
  ConnectionError
};
