const validateArguments = require("./validateArguments.js");
const ucpSendUntilReceive = require("./ucpSendUntilReceive.js");

const crypto = require("crypto");
const dgram = require("dgram");

const { Bedrock } = require("@static/packets.js");

const { /*show_hexy,*/ stringArrayToObject, TimeoutPromise } = require("@lib/helpers.js");

const { ConnectionError } = require("@static/globals.js");

async function query(hostname, port, timeout) {
  validateArguments(hostname, port, timeout);

  console.log("bedrock query", hostname, port);

  const socket = dgram.createSocket({ type: "udp4" });

  const timeoutPromise = TimeoutPromise(timeout, new ConnectionError("Connection timed out"));

  const timeStart = Date.now();

  await new Promise((resolve, reject) => {
    socket.once("error", e => reject(new ConnectionError(e.message)));
    socket.once("connect", resolve);

    socket.connect(port, hostname);
  });

  const latency = Math.ceil(Date.now() - timeStart);

  const encoded = Bedrock.unconnected_ping.encode({
    time      : BigInt(Math.floor(Date.now() / 1000)),
    magic     : null,
    clientGUID: crypto.randomBytes(8)
  });

  const buffer = await Promise.race([
    ucpSendUntilReceive(socket, encoded, 1000),
    timeoutPromise
  ]);

  return { latency, buffer };
}

function strings(packet) {
  // bedrock doesn't need one as the packet format response is a constant length, thanks raknet!
}

module.exports = {
  query,
  strings
};
