const validateArguments = require("./validateArguments.js");

const net = require("net");
const varint = require("varint");

const { Java } = require("@static/packets.js");
const { ConnectionError } = require("@static/globals.js");
const { show_hexy } = require("@lib/helpers.js");

const connectionTimeout =
  timeout => new Promise(
    (_, reject) => setTimeout(
      () => reject(
        new ConnectionError("Connection timed out")
      ),
      timeout
    )
  );

async function query(host, port, timeout) {
  validateArguments(host, port, timeout);

  const startTime = Date.now();

  const socket = await Promise.race([
    new Promise((resolve, reject) => {
      const _socket = new net.Socket();

      _socket.on("connect", () => resolve(_socket));
      _socket.on("error", e => reject(new ConnectionError(e.message)));

      _socket.connect(port, host);
    }),
    connectionTimeout(timeout)
  ]);

  return {};
}

function strings(buffer) {
  let beginOffset = 0;
  let endOffset = buffer.byteLength - 1;

  while (buffer[beginOffset] !== '{'.charCodeAt(0) && beginOffset < endOffset) {
    beginOffset++;
  }

  while (buffer[endOffset] !== '}'.charCodeAt(0) && endOffset > beginOffset) {
    endOffset--;
  }

  if (endOffset - beginOffset == 1) {
    throw new Error("Java Strings failed: no JSON text found");
  }

  return JSON.parse(buffer.slice(beginOffset, endOffset + 1).toString("utf-8"));
}

module.exports = {
  query,
  strings
};
