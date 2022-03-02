const fs = require("fs");
const uuid = require("uuid");

if (!process.env.WEBPACK) {
  require("module-alias/register");
}

const {
  // stringArrayToObject,
  verifyHostname,
  // removeFormatting,
  // TimeoutPromise
} = require("@lib/helpers.js");

// const {
//   query: queryQuery,
//   strings: queryStrings
// } = require("@lib/query/query.js");

// const {
//   query: queryBedrock,
//   strings: bedrockStrings
// } = require("@lib/query/bedrock.js");

const {
  query: queryJava,
  strings: javaStrings
} = require("@lib/query/java.js");

const { Bedrock, Java, Query } = require("@static/packets.js");
const { ConnectionError } = require("@static/globals.js");

const TIMEOUT_MS = 5000;

/* "rawHost" may have a port in it, which should be overridden
 * with the optional port argument should one be provided
 */
async function queryServer(rawHost, rawPort = null) {
  const [host, defaultPort] = rawHost.split(':', 2);

  if (!verifyHostname(host)) {
    throw new Error("Host is invalid");
  }

  let port;
  if (rawPort) {
    if (typeof rawPort === "number") {
      port = rawPort;
    } else {
      throw new Error("Port argument is not a number");
    }
  } else if (defaultPort) {
    if (/^\d+$/.test(defaultPort)) {
      port = Number.parseInt(defaultPort);
    } else {
      throw new Error("Port section of host argument is not a number");
    }
  }

  switch (port) {
    case 25565:
      console.group("Trying " + host + (port ? `:${port}` : "") + " as Java");

      const { latency, buffer } = await queryJava(host, port, TIMEOUT_MS);

      console.groupEnd();
      break;

    case 19132:
      throw new Error("Probing Bedrock/MCPE servers is not implemented yet");

      break;

    default:
      throw new Error("Detecting remote server type is not implemented yet");
  }
}

module.exports = queryServer;
