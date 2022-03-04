const validateArguments = require("@lib/validateArguments.js");
const udpSendUntilReceive = require("@lib/udpSendUntilReceive.js");

const crypto = require("crypto");
const dgram = require("dgram");

const { Bedrock } = require("@static/packets.js");

const { /*show_hexy,*/ stringArrayToObject, ConnectionError, TimeoutPromise } = require("@lib/helpers.js");

async function query(hostname, port, timeout) {
  validateArguments(hostname, port, timeout);

  const timeoutPromise = TimeoutPromise(timeout, "Bedrock Query");

  console.group("Establishing connection")
  const socket = await Promise.race([
    new Promise((resolve, reject) => {
      const _socket = dgram.createSocket({ type: "udp4" });

      _socket.once("error", e => reject(new ConnectionError(e.message)));
      _socket.once("connect", () => resolve(_socket));

      _socket.connect(port, hostname);
    }),
    timeoutPromise
  ]);
  console.log(`Connection established`);
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
  console.groupEnd();

  console.log(`Received ${buffer.length} byte(s), latency is ${latency}ms`);

  return { latency, buffer };
}

function strings(packet) {
  // bedrock doesn't need one as the packet format response is a constant length, thanks raknet!
}

module.exports = {
  query,
  strings
};
