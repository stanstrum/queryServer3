const validateArguments = require("@lib/validateArguments.js");

const net = require("net");
const varint = require("varint");

const { Java } = require("@static/packets.js");
const { show_hexy, ConnectionError, TimeoutPromise } = require("@lib/helpers.js");

function readJavaPacket(socket) {
  let listener;

  return new Promise((resolve, reject) => {
    let pre_buf;
    let buffer;
    let offset = 0;

    listener = data => {
      try {
        if (!buffer) {
          let length;

          if (pre_buf) {
            length = varint.decode(Buffer.concat([ pre_buf, data ]));
          } else {
            length = varint.decode(data);
          }

          length += varint.decode.bytes;
          // console.log(`Received first chunk, allocating buffer with ${length} byte(s)`);
          buffer = Buffer.alloc(length);

          if (pre_buf) {
            pre_buf.copy(buffer);
            offset += pre_buf.length;
          }
        }

        if (data.length + offset > buffer.length) {
          const error_message = `Ran out of space buffer: buffer size is ${buffer.length} byte(s), offset is ${offset} byte(s), chunk length is ${data.length} byte(s)`;

          throw new Error(error_message);
        }

        data.copy(buffer, offset);
        offset += data.length;

        if (buffer.length !== offset) {
          // console.log(`Copied ${data.length} byte(s) from handler, new offset is ${offset} byte(s)`);
        } else {
          // console.log(`Copied last chunk of ${data.length} byte(s), total size is ${buffer.length} byte(s)`);

          resolve(buffer);
        }
      } catch (e) {
        if (!buffer && e instanceof RangeError) {
          // console.log("Failed to read varint, saving pre_buf of " + data.length + " byte(s)");

          pre_buf = data;

          return;
        } else {
          reject(e);
        }
      }
    }

    socket.on("data", listener);
  })
    .finally(
      () => socket.removeListener("data", listener)
    );
};

async function getData(host, port, timeout) {
  let timeoutPromise = TimeoutPromise(timeout, "Java Query");

  console.group("Establishing connection");

  const socket = await Promise.race([
    new Promise((resolve, reject) => {
      const _socket = new net.Socket();

      _socket.once("connect", () => resolve(_socket));
      _socket.once("error", e => reject(new ConnectionError(e.message)));

      _socket.connect(port, host);
    }),
    timeoutPromise
  ]);

  console.log(`Connection established`);
  console.groupEnd();

  // socket.on("data", data => show_hexy(data, '<'));
  const write = data => {
    show_hexy(data, '>');
    socket.write(data);
  };

  const handshake = Java.handshake.encode({
    protocolVersion: Java.protocolVersion,
    serverAddress: host,
    serverPort: port,
    nextState: 1
  });
  const request = Java.request.encode({});
  const ping = Java.ping.encode({ payload: Buffer.from("sebglhp\0") }, 8);

  console.group("Sending handshake");
  write(handshake);
  console.groupEnd();

  console.group("Sending request");
  write(request);
  console.groupEnd();

  console.group("Waiting for response");
  const response = await Promise.race([
    readJavaPacket(socket),
    timeoutPromise
  ]);
  console.groupEnd();

  console.group("Performing ping/pong for latency");

  write(ping);
  const startTime = Date.now();

  const pong = await Promise.race([
    readJavaPacket(socket),
    timeoutPromise
  ]);
  const latency = Date.now() - startTime;

  if (ping.compare(pong) !== 0) {
    console.log("Ping and pong packets differ?");
  }

  console.groupEnd();
  console.log(`Ping/pong completed, latency is ${latency}ms`);

  socket.end();

  timeoutPromise.catch(() => {});
  return { latency, buffer: response };
}

async function queryJava(host, port, timeout) {
  validateArguments(...arguments);

  const returnObject = {
    motd: null,
    version: null,
    latency: null,
    players: {
      online: null,
      max: null,
      list: null
    },
    favicon: null,
    type: "Java"
  };

  console.group("Trying " + host + (port ? `:${port}` : "") + " as Java");
  const results = await getData(host, port, timeout);
  const { buffer } = results;
  console.groupEnd();
  
  console.group("Decoding response packet");

  if (typeof results.latency === "number") {
    returnObject.latency = results.latency;
  }

  try {
    const decoded = Java.response.decode(buffer);
    const responseAsObject = JSON.parse(decoded.jsonResponse);

    if (typeof responseAsObject !== "object")
      throw new Error("responseAsObject is not an object");

    // console.group("Decoded response object:");
    // console.dir(responseAsObject, { depth: null });
    // console.groupEnd();

    if (typeof responseAsObject.version?.name !== "string")
      throw new Error("No version in responseAsObject");

    returnObject.version = responseAsObject.version.name;

    if (
      responseAsObject.description?.extra instanceof Array &&
      responseAsObject.description.extra.every(line => typeof line.text === "string")
    ) {
      returnObject.motd = responseAsObject.description.extra.map(({ text }) => text).join("");
    } else if (typeof responseAsObject.description?.text === "string") {
      returnObject.motd = responseAsObject.description.text;
    } else if (typeof responseAsObject.description === "string") {
      returnObject.motd = responseAsObject.description;
    }

    if (
      typeof responseAsObject.players?.max    !== "number" ||
      typeof responseAsObject.players?.online !== "number"
    ) {
      throw new Error("Invalid players structure");
    }

    returnObject.players.max = responseAsObject.players.max;
    returnObject.players.online = responseAsObject.players.online;

    if (
      responseAsObject.players?.sample?.every(
        entry => typeof entry?.id === "string" || typeof entry?.name === "string"
      )
    ) {
      returnObject.players.list = responseAsObject.players.sample.map(({ id, name }) => ({ uuid: id, name }));
    } else {
      console.log("No player sample");

      // returnObject.players.list = [];
    }

    if (responseAsObject?.favicon) {
      returnObject.favicon = responseAsObject.favicon;
    }

    console.groupEnd();

  } catch (e) {
    console.error(e?.stack || e);
    console.groupEnd();

    console.group("Failed to decode, trying strings");
    throw new Error("Strings not implemented");
    console.groupEnd();
  }

  return returnObject;
}

// function strings(buffer) {
//   let beginOffset = 0;
//   let endOffset = buffer.byteLength - 1;

//   while (buffer[beginOffset] !== '{'.charCodeAt(0) && beginOffset < endOffset) {
//     beginOffset++;
//   }

//   while (buffer[endOffset] !== '}'.charCodeAt(0) && endOffset > beginOffset) {
//     endOffset--;
//   }

//   if (endOffset - beginOffset == 1) {
//     throw new Error("Java Strings failed: no JSON text found");
//   }

//   return JSON.parse(buffer.slice(beginOffset, endOffset + 1).toString("utf-8"));
// }

module.exports = {
  queryJava,
  // strings
};
