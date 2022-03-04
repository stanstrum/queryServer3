const validateArguments = require("@lib/validateArguments.js");
const udpSendUntilReceive = require("@lib/udpSendUntilReceive.js");

const crypto = require("crypto");
const dgram = require("dgram");

const { Query } = require("@static/packets.js");

const { /*show_hexy,*/ stringArrayToObject, ConnectionError, TimeoutPromise } = require("@lib/helpers.js");

const baseObject = { players: {} };
async function query(hostname, port, timeout) {
  validateArguments(hostname, port, timeout);

  console.log("query query", hostname, port);

  const socket = dgram.createSocket({ type: "udp4" });

  const timeStart = Date.now();

  await new Promise((resolve, reject) => {
    socket.once("error", e => reject(new ConnectionError("Socket error: " + e.message)));

    const rejectTimeout = setTimeout(() => reject(new ConnectionError("Connection timed out")), timeout);
    socket.once("connect", () => {
      clearTimeout(rejectTimeout);

      resolve();
    });

    socket.connect(port, hostname);
  });

  const latency = Math.ceil(Date.now() - timeStart);

  {
    const encoded = Query.handshake.encode({
      magic         : null,
      type          : 9,
      sessionID     : 1 & 0x0F0F0F0F,
      challengeToken: Math.floor(Math.random() * 0x7FFFFFFF)
    });

    const buffer = await udpSendUntilReceive(socket, encoded, 1000, timeout);

    const response = Query.response.decode(buffer);

    var token = Number.parseInt(response.challenge);
  }

  // console.log("token=", token);

  try {
    const encoded = Query.basic_stat_request.encode({
      magic         : null,
      type          : 0,
      sessionID     : 1 & 0x0F0F0F0F,
      challengeToken: token
    });

    var basic = await udpSendUntilReceive(socket, encoded, 1000, timeout);
  } catch {}

  const encoded = Query.full_stat_request.encode({
    magic         : null,
    type          : 0,
    sessionID     : 1 & 0x0F0F0F0F,
    challengeToken: token,
    padding       : Buffer.alloc(4)
  });

  const full = await udpSendUntilReceive(socket, encoded, 1000, timeout);

  return { latency, buffers: [ basic, full ] };
}

module.exports = {
  query
};
