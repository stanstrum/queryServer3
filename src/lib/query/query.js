const validateArguments = require("@lib/validateArguments.js");
const udpSendUntilReceive = require("@lib/udpSendUntilReceive.js");

const crypto = require("crypto");
const dgram = require("dgram");

const { Query } = require("@static/packets.js");

const { show_hexy, stringArrayToObject, ConnectionError, TimeoutPromise, merge, shouldDebug } = require("@lib/helpers.js");

async function getData(hostname, port, timeout) {
  const timeoutPromise = TimeoutPromise(timeout, "Query Query");

  shouldDebug && console.group("Establishing connection")

  const socket = await Promise.race([
    new Promise((resolve, reject) => {
      const _socket = dgram.createSocket({ type: "udp4" });

      _socket.once("error", e => reject(new ConnectionError(e.message)));
      _socket.once("connect", () => resolve(_socket));

      _socket.connect(port, hostname);
    }),
    timeoutPromise
  ]);

  shouldDebug && console.log(`Connection established`);
  shouldDebug && console.groupEnd();

  const timeStart = Date.now();

  {
    const encoded = Query.handshake.encode({
      magic         : null,
      type          : 9,
      sessionID     : 1 & 0x0F0F0F0F,
      challengeToken: Math.floor(Math.random() * 0x7FFFFFFF)
    });

    const buffer = await udpSendUntilReceive(socket, encoded, 1000, timeoutPromise);

    const { challenge } = Query.response.decode(buffer);
    var token = Number.parseInt(challenge);
  }

  const latency = Math.ceil(Date.now() - timeStart);

  try {
    const encoded = Query.basic_stat_request.encode({
      magic         : null,
      type          : 0,
      sessionID     : 1 & 0x0F0F0F0F,
      challengeToken: token
    });

    var basic_buffer = await udpSendUntilReceive(socket, encoded, 1000, timeoutPromise);
  } catch {}

  {
    const encoded = Query.full_stat_request.encode({
      magic         : null,
      type          : 0,
      sessionID     : 1 & 0x0F0F0F0F,
      challengeToken: token,
      padding       : Buffer.alloc(4)
    });

    var full_buffer = await udpSendUntilReceive(socket, encoded, 1000, timeoutPromise);
  }

  return { latency, basic_buffer, full_buffer };
}

async function queryQuery(host, port, timeout) {
  validateArguments(...arguments);

  const returnObject = {
    motd: null,
    version: null,
    latency: null,
    players: {
      online: null,
      max: null,
    }
  };

  shouldDebug && console.group("Trying " + host + (port ? `:${port}` : "") + " as Query");
  const { latency, basic_buffer, full_buffer } = await getData(host, port, timeout);
  shouldDebug && console.groupEnd();

  shouldDebug && console.group("Decoding response packet");

  if (typeof latency !== "number")
    throw new Error("No latency");

  returnObject.latency = latency;

  let hostname;
  if (basic_buffer instanceof Buffer) {
    let basic;

    try {
      basic = Query.basic_stat_response.decode(basic_buffer);
    } catch {
      try {
        basic = stringArrayToObject(Query.full_stat_response.decode(basic_buffer, [11, 10]).status);
      } catch {
        basic = basic_strings(basic_buffer);
      }
    }

    if (!/^\d+$/.test(basic.numplayers) || !/^\d+$/.test(basic.maxplayers))
      throw new Error("No numplayers/maxplayers");

    returnObject.players.online = Number.parseInt(basic.numplayers);
    returnObject.players.max = Number.parseInt(basic.maxplayers);

    if (typeof basic?.motd === "string") {
      returnObject.motd = basic.motd;
    } else {
      returnObject.motd = basic.hostname;
    }

    if (typeof basic?.version === "string") {
      returnObject.version = basic.version;
    }
  }

  shouldDebug && console.groupEnd();

  return returnObject;
}

function basic_strings(buffer) {
  if (!(buffer instanceof Buffer))
    throw new Error("Not a buffer");

  let begin_offset = 0;

  const begin_delim = Buffer.from("\x01splitnum\x00\x80\x00", "ascii");
  while (
    !begin_delim.equals(buffer.slice(begin_offset, begin_offset + begin_delim.length)) &&
    begin_offset <= (buffer.length - begin_delim.length)
  ) { begin_offset++; }

  begin_offset += begin_delim.length;

  const end_delim = Buffer.from([0x00, 0x00, 0x01]);
  let end_offset = begin_offset;

  while (
    !end_delim.equals(buffer.slice(end_offset, end_offset + end_delim.length)) &&
    end_offset <= buffer.length
  ) { end_offset++; }

  const sliced = buffer.slice(begin_offset, end_offset);

  const items = [];
  let current = "";
  for (const byte of sliced.values()) {
    if (byte) {
      current += String.fromCharCode(byte)
    } else {
      items.push(current);

      current = "";
    }
  }

  return stringArrayToObject(items);
}

module.exports = {
  queryQuery
};
