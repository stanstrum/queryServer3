"use strict";

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
  merge,
  shouldDebug
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

const util = require("util");
const dns = require("node:dns");

const srvResolve = util.promisify(dns.resolveSrv);

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

  let srvs;
  try {
    srvs = await srvResolve(`_minecraft._tcp.${host}`);
  } catch {};

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
  const calls = [];

  const switchPort = (thisHost, thisPort) => {
    if (thisPort)
      calls.push([queryQuery, [thisHost, thisPort, TIMEOUT_MS]]);

    switch (thisPort) {
      case 25565:
        calls.push([queryJava, [thisHost, thisPort, TIMEOUT_MS]]);

        break;
      case 19132:
        calls.push([queryBedrock, [thisHost, thisPort, TIMEOUT_MS]]);

        break;

      case null:
        calls.push([queryQuery, [thisHost, 25565, TIMEOUT_MS]]);
        calls.push([queryQuery, [thisHost, 19132, TIMEOUT_MS]]);
      default:
        calls.push([queryJava, [thisHost, thisPort || 25565, TIMEOUT_MS]]);
        calls.push([queryBedrock, [thisHost, thisPort || 19132, TIMEOUT_MS]]);
    }
  }

  switchPort(host, port);

  if (srvs?.length)
    for (const { name: srvName, port: srvPort } of srvs)
      switchPort(srvName, srvPort);

  let results;
  if (!shouldDebug) {
    results = await Promise.allSettled(
      calls.map(([ func, args ]) => func.apply(null, args))
    );
  } else {
    console.dir(calls);

    results = [];

    for (const [ func, args ] of calls) {
      try {
        const result = await func.apply(null, args);

        results.push({ status: "fulfilled", value: result });
      } catch (e) {
        results.push({ status: "rejected", reason: e });
      }
    }
  }

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
      returnObject.motd = obj?.name;
  } catch {}

  if (shouldDebug) {
    results
      .map((result, idx) => [result, idx])
      .filter(([{ status }]) => status === "rejected")
      .map(([{ reason }, idx]) => [reason, idx])
      .forEach(([reason, idx]) => console.log(`${calls[idx][0].name}: ${reason[1]?.stack || reason.toString()}`));
  }

  return returnObject;
}

module.exports = queryServer;
