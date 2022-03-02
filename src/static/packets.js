const { DataTypes: DT, PacketTypes } = require("./globals.js");

const PacketTool    = require("@lib/PacketTool/PacketTool.js");
const { auto }      = require("@lib/helpers.js");

const Bedrock = {
  unconnected_ping: new PacketTool(
    [
      { time      : DT.Int64BE        },
      { magic     : DT.RAKNET_MAGIC   },
      { clientGUID: DT.FixedByteArray }
    ],
    0x01,
    PacketTypes.Raknet
  ),
  unconnected_pong: new PacketTool(
    [
      { time      : DT.Int64BE        },
      { serverGUID: DT.FixedByteArray },
      { magic     : DT.RAKNET_MAGIC   },
      { serverID  : DT.UShortString   }
    ],
    0x1c,
    PacketTypes.Raknet
  )
};

const Java = {
  protocolVersion: 758,
  handshake: new PacketTool(
    [
      { protocolVersion: DT.VarInt       },
      { serverAddress  : DT.VarIntString },
      { serverPort     : DT.UShortLE     },
      { nextState      : DT.VarInt       }
    ],
    0x00,
    PacketTypes.Java
  ),
  request: new PacketTool([], 0x00, PacketTypes.Java),
  response: new PacketTool(
    [
      { jsonResponse: DT.VarIntString }
    ],
    0x00,
    PacketTypes.Java
  ),
  ping: new PacketTool(
    [
      { payload: DT.FixedByteArray }
    ],
    0x01,
    PacketTypes.Java
  ),
  pong: new PacketTool(
    [
      { payload: DT.FixedByteArray }
    ],
    0x01,
    PacketTypes.Java
  )
};

const Query = {
  handshake: new PacketTool(
    [
      { magic         : DT.LEGACY_MAGIC   },
      { type          : DT.UByte          },
      { sessionID     : DT.Int32BE        },
      { challengeToken: DT.Int32BE        }
    ],
    null,
    PacketTypes.Raw
  ),
  response: new PacketTool(
    [
      { type     : DT.UByte                },
      { sessionID: DT.Int32BE              },
      { challenge: DT.NullTerminatedString }
    ],
    null,
    PacketTypes.Raw
  ),
  basic_stat_request: new PacketTool(
    [
      { magic         : DT.LEGACY_MAGIC   },
      { type          : DT.UByte          },
      { sessionID     : DT.Int32BE        },
      { challengeToken: DT.Int32BE        },
    ],
    null,
    PacketTypes.Raw
  ),
  basic_stat_response: new PacketTool(
    [
      { type      : DT.UByte                },
      { sessionID : DT.Int32BE              },
      { motd      : DT.NullTerminatedString },
      { gametype  : DT.NullTerminatedString },
      { map       : DT.NullTerminatedString },
      { numPlayers: DT.NullTerminatedString },
      { maxPlayers: DT.NullTerminatedString },
      { hostPort  : DT.UShortLE             },
      { hostIP    : DT.NullTerminatedString }
    ],
    null,
    PacketTypes.Raw
  ),
  full_stat_request: new PacketTool(
    [
      { magic         : DT.LEGACY_MAGIC   },
      { type          : DT.UByte          },
      { sessionID     : DT.Int32BE        },
      { challengeToken: DT.Int32BE        },
      { padding       : DT.FixedByteArray }
    ],
    null,
    PacketTypes.Raw
  ),
  full_stat_response: new PacketTool(
    [
      { type     : DT.UByte                     },
      { sessionID: DT.Int32BE                   },
      { padding  : DT.FixedByteArray            },
      { status   : DT.NullTerminatedStringArray },
      { padding  : DT.FixedByteArray            },
      { players  : DT.NullTerminatedStringArray }
    ],
    null,
    PacketTypes.Raw
  )
};

module.exports = {
  Bedrock,
  Java,
  Query
};
