"use strict";

process.on("unhandledRejection", (reason, promise) => console.log(`Unhandled Rejection at ${promise}, ${reason?.stack || reason.toString()}`));

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

const {
  queryQuery,
//   strings: queryStrings
} = require("@lib/query/query.js");

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
  // Parse arguments
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

  // Return structure
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
    ip: host.toLowerCase(),
    type: null
  };

  // Determine what type of querying we should do
  let calls = [];
  switch (port) {
    case 25565:
      calls.push([queryJava, [host, port, TIMEOUT_MS]]);
      calls.push([queryQuery, [host, port, TIMEOUT_MS]]);

      break;
    case 19132:
      calls.push([queryBedrock, [host, port, TIMEOUT_MS]]);
      calls.push([queryQuery, [host, port, TIMEOUT_MS]]);

      break;
    default: {
      calls.push([queryJava, [host, 25565, TIMEOUT_MS]]);
      calls.push([queryBedrock, [host, 19132, TIMEOUT_MS]]);
      calls.push([queryQuery, [host, 25565, TIMEOUT_MS]]);
      calls.push([queryQuery, [host, 19132, TIMEOUT_MS]]);
    }
  }

  let promises;
  if (process.env.NODE_ENV === "production") {
    promises = calls.map(([ func, args ]) => func.apply(null, args));
  } else {
    promises = [];

    for (const [ func, args ] of calls) {
      try {
        const result = await func.apply(null, args)

        promises.push(
          Promise.resolve(result)
        );
      } catch (e) {
        promises.push(Promise.reject(e));
      }
    }
  }

  const results = await Promise.allSettled(promises);

  if (results.every(({ status }) => status === "rejected"))
    throw new AggregateError(
      results.map(({ reason }) => reason),
      "All query promises rejected"
    );

  results
    .filter(({ status }) => status === "fulfilled")
    .map(({ value }) => value)
    .forEach(obj => {
      if (returnObject.type && returnObject.type !== obj.type) {
        returnObject.type = "Crossplay";
      }

      merge(returnObject, obj);
    });

  // Clean up returnObject values
  if (typeof returnObject.motd === "string") {
    returnObject.motd =
      returnObject.motd
        .replace(/[§\uFFFD][0-9a-fk-or]/ig, "")
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length)
        .join('\n');
  }

  returnObject.motd ||= "";
  returnObject.version ||= "Unknown";
  returnObject.players.list &&= returnObject.players.list.map(({ uuid, name }) => ({ uuid, name: name.replace(/§[0-9a-fk-or]/ig, "") }));
  returnObject.players.list ||= [];
  returnObject.type ||= "Unknown";

  try {
    const obj = JSON.parse(returnObject.motd.replace(/-/g, '"'));

    if (typeof obj?.name === "string")
      returnObject.motd ||= obj?.name;
  } catch {}

  return returnObject;
}

module.exports = queryServer;
