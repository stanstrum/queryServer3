const validateArguments = require("./validateArguments.js");

const net = require("net");
const varint = require("varint");

const { Java } = require("@static/packets.js");
const { ConnectionError } = require("@static/globals.js");
const { show_hexy } = require("@lib/helpers.js");

const connectionTimeout =
  async (timeout, what) => await new Promise(
    (_, reject) => setTimeout(
      () => reject(new ConnectionError(what + ": Connection timed out")),
      timeout
    )
  );

const readJavaPacket = async socket =>
  await new Promise((resolve, reject) => {
    let buffer;
    let offset = 0;

    socket.on("data", data => {
      if (!buffer) {
        let length = varint.decode(data, 0);
        length += varint.decode.bytes;

        console.log(`Received first chunk, allocating buffer with ${length} byte(s)`);
        buffer = Buffer.alloc(length);
      }

      if (data.length + offset > buffer.length) {
        const error_message = `Ran out of space buffer: buffer size is ${buffer.length} byte(s), offset is ${offset} byte(s), chunk length is ${data.length} byte(s)`;

        reject(new Error(error_message));
      }

      data.copy(buffer, offset);
      offset += data.length;

      if (buffer.length !== offset) {
        console.log(`Copied ${data.length} byte(s) from handler, new offset is ${offset} byte(s)`);
      } else {
        console.log(`Copied last chunk of ${data.length} byte(s), total size is ${buffer.length} byte(s)`);
        resolve(buffer);
      }
    });
  });

async function query(host, port, timeout) {
  validateArguments(...arguments);

  let timeoutPromise = connectionTimeout(timeout, "Java Query");

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

  socket.on("data", data => show_hexy(data, '<'));
  socket.on("end", data => console.log("Socket ended"));
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

  console.group("Decoding response packet");
  const decoded = Java.response.decode(response);
  console.dir(JSON.parse(decoded.jsonResponse));

  return { latency, };
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
  query,
  // strings
};
