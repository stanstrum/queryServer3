const validateArguments = require("@lib/validateArguments.js");
const udpSendUntilReceive = require("@lib/udpSendUntilReceive.js");

const crypto = require("crypto");
const dgram = require("dgram");

const { Bedrock } = require("@static/packets.js");

const { /*show_hexy,*/ stringArrayToObject, ConnectionError, TimeoutPromise } = require("@lib/helpers.js");

async function getData(hostname, port, timeout) {
  validateArguments(hostname, port, timeout);

  const timeoutPromise = TimeoutPromise(timeout, "Bedrock Query");

  console.group("Establishing connection");

  const socket = await Promise.race([
    new Promise((resolve, reject) => {
      const _socket = dgram.createSocket({ type: "udp4" });

      _socket.once("error", e => reject(new ConnectionError(e.message)));
      _socket.once("connect", () => resolve(_socket));

      _socket.connect(port, hostname);
    }),
    timeoutPromise
  ]);

  console.log("Connection established");
  console.groupEnd();

  const encoded = Bedrock.unconnected_ping.encode({
    time      : BigInt(Math.floor(Date.now() / 1000)),
    magic     : null,
    clientGUID: crypto.randomBytes(8)
  });

  console.group("Sending packet until receipt");
  const timeStart = Date.now();
  const buffer = await udpSendUntilReceive(socket, encoded, 1000, timeoutPromise);
  const latency = Math.ceil(Date.now() - timeStart);
  console.log(`Received ${buffer.length} byte(s), latency is ${latency}ms`);
  console.groupEnd();

  return { latency, buffer };
}

async function queryBedrock(host, port, TIMEOUT_MS) {
  validateArguments(...arguments);

  const returnObject = {
    motd: null,
    version: null,
    latency: null,
    players: {
      online: null,
      max: null,
    },
    type: "Bedrock"
  };

  console.group("Trying " + host + (port ? `:${port}` : "") + " as Bedrock");
  const results = await getData(host, port, TIMEOUT_MS);
  console.groupEnd();

  console.group("Decoding response packet");

  if (typeof results?.latency !== "number") {
    throw new Error("No latency returned from queryBedrock");
  }

  returnObject.latency = results.latency;

  if (!(results?.buffer instanceof Buffer)) {
    throw new Error("No buffer returned from queryBedrock");
  }

  // https://wiki.vg/Raknet_Protocol#Unconnected_Pong
  const decoded = Bedrock.unconnected_pong.decode(results.buffer, [8]);

  // console.dir(decoded);

  console.log("Parsing serverID");

  if (typeof decoded?.serverID !== "string")
    throw new Error("Decoded buffer does not have serverID");

  const [, motd1, , version, online, max, , motd2] = decoded.serverID.split(';');
  const motd = [motd1, motd2].filter(line => line).join("\n");

  if (!motd) {
    throw new Error("No MOTD");
  }

  returnObject.motd = motd;

  if (!version) {
    throw new Error("No version");
  }

  returnObject.version = version;

  if (!/^\d+$/.test(online) || !/^\d+$/.test(max))
    throw new Error("No online/max");

  returnObject.players.online = Number.parseInt(online);
  returnObject.players.max = Number.parseInt(max);

  // returnObject.players.list = [];

  console.log("Done");
  console.groupEnd();

  return returnObject;
}

// function strings(packet) {
//   bedrock doesn't need one as the packet format response is a constant length, thanks raknet!
// }

module.exports = {
  queryBedrock,
  // strings
};
