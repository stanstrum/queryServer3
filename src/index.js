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
  ConnectionError
} = require("@lib/helpers.js");

// const {
//   query: queryQuery,
//   strings: queryStrings
// } = require("@lib/query/query.js");

const {
  query: queryBedrock,
//   strings: bedrockStrings
} = require("@lib/query/bedrock.js");

const {
  query: queryJava,
  strings: javaStrings
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
      console.group("Trying " + host + (port ? `:${port}` : "") + " as Java");
      const results = await queryJava(host, port, TIMEOUT_MS);
      const { buffer } = results;
      console.groupEnd();

      console.group("Decoding response packet");

      if (typeof results.latency === "number") {
        returnObject.latency = results.latency.toString();
      }

      try {
        const decoded = Java.response.decode(buffer);
        const responseAsObject = JSON.parse(decoded.jsonResponse);

        if (typeof responseAsObject !== "object")
          throw new Error("responseAsObject is not an object");

        if (responseAsObject.favicon?.length > 100)
          responseAsObject.favicon = "too long";

        // console.group("Decoded response object:");
        // console.dir(responseAsObject, { depth: null });
        // console.groupEnd();

        if (typeof responseAsObject.version?.name !== "string")
          throw new Error("No version in responseAsObject");

        returnObject.version = responseAsObject.version.name;

        if (typeof responseAsObject.description?.text === "string") {
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

        returnObject.players.max = responseAsObject.players.max.toString();
        returnObject.players.online = responseAsObject.players.online.toString();

        if (
          responseAsObject.players?.sample?.every(
            entry => typeof entry?.id === "string" || typeof entry?.name === "string"
          )
        ) {
          returnObject.players.list = responseAsObject.players.sample.map(({ id, name }) => ({ uuid: id, name }));
        } else {
          console.log("No player sample, defaulting to []");

          returnObject.players.list = [];
        }

        console.groupEnd();

      } catch (e) {
        console.error(e?.stack || e);
        console.groupEnd();

        console.group("Failed to decode, trying strings");
        throw new Error("Strings not implemented");
        console.groupEnd();
      }
    } break;

    case 19132: {
      console.group("Trying " + host + (port ? `:${port}` : "") + " as Bedrock");
      const results = await queryBedrock(host, port, TIMEOUT_MS);
      console.groupEnd();

      console.group("Decoding response packet");

      if (typeof results?.latency !== "number") {
        throw new Error("No latency returned from queryBedrock");
      }

      returnObject.latency = results.latency.toString();

      if (!(results?.buffer instanceof Buffer)) {
        throw new Error("No buffer returned from queryBedrock");
      }

      // https://wiki.vg/Raknet_Protocol#Unconnected_Pong
      const decoded = Bedrock.unconnected_pong.decode(results.buffer, [8]);

      // console.dir(decoded);

      console.groupEnd();
      console.group("Parsing serverID");

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

      if (!online || !max)
        throw new Error("No online/max");

      returnObject.players.online = online;
      returnObject.players.max = max;

      returnObject.players.list = [];

      console.groupEnd();
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
