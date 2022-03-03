const { verifyHostname } = require("@lib/helpers.js");

const { ConnectionError } = require("@static/globals.js");

function validateArguments(hostname, port, timeout) {
  if (!verifyHostname(hostname))
    throw new ConnectionError("Host name is invalid");

  if (!(typeof port === "number" &&
        port % 1 === 0           &&
        port >= 0                &&
        port <= 65535)
  ) {
    throw new ConnectionError("Port must be a whole number from 0-65535");
  }

  if (!(typeof timeout === "number" &&
        timeout % 1 === 0           &&
        timeout >= 0)
  ) {
    throw new ConnectionError("Timeout must be a whole number from 0-65535");
  }

  return true;
}

module.exports = validateArguments
