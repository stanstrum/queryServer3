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
  ConnectionError,
  merge
} = require("@lib/helpers.js");

// const {
//   query: queryQuery,
//   strings: queryStrings
// } = require("@lib/query/query.js");

const {
  queryBedrock,
//   strings: bedrockStrings
} = require("@lib/query/bedrock.js");

const {
  queryJava,
  // strings: javaStrings
} = require("@lib/query/java.js");

const { Bedrock, Java, Query } = require("@static/packets.js");

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
    if (typeof rawPort !== "number")
      throw new Error("Port argument is not a number");

    port = rawPort;
  } else if (defaultPort) {
    if (!/^\d+$/.test(defaultPort))
      throw new Error("Port section of host argument is not a number");

    port = Number.parseInt(defaultPort);
  }

  if (port < 0 || port > 65535)
    throw new Error("Port is out of range (0-65535)");

  const returnObject = {
    motd: null,
    version: null,
    latency: null,
    players: {
      online: null,
      max: null,
      list: null
    }
  };

  switch (port) {
    case 25565: {
      merge(
        returnObject,
        await queryJava(host, port, TIMEOUT_MS)
      );

    } break;

    case 19132: {
      merge(
        returnObject,
        await queryBedrock(host, port, TIMEOUT_MS)
      );

    } break;

    default:
      throw new Error("Detecting remote server type is not implemented yet");
  }

  // Clean up returnObject strings
  if (typeof returnObject.motd === "string") {
    returnObject.motd =
      returnObject.motd
      .replace(/§[0-9a-fk-or]/ig, "")
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length)
      .join('\n');
  }

  return returnObject;
}

module.exports = queryServer;
