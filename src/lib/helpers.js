const dgram = require("dgram");
const { hexy } = require("hexy");

Object.prototype.getByValue = function(value) {
  return Object.keys(this).find(key => value === this[key]);
}

String.prototype.hexToBuffer = function() {
  if (!/^([0-9a-fA-F]{2})*$/g.test(this)) {
    throw new Error("Invalid this cannot be made into a buffer");
  }

  // No rounding needed as previous regex check only matches multiples of two hex digits
  const buf = Buffer.alloc(this.length / 2);

  // Quick & dirty way of splitting every two characters
  const strBytes = this.match(/../g);
  for (let i = 0; i < strBytes.length; i++) {
    buf[i] = Number.parseInt(strBytes[i], 16);
  }

  return buf;
}

Object.prototype.getOnlyKey = function(key) {
  const keys = Object.keys(this);

  if (keys.length !== 1) {
    return null;
    // throw new Error("getOnlyKey relies on the specified object only having one key");
  }

  const firstKey = keys.pop();
  return firstKey;
}

function verifyHostname(hostname) {
  if (typeof hostname !== "string") {
    return false;
  }

  const labels = hostname.split('.').filter(label => label.length > 0);

  if (!/^[a-zA-Z0-9-.]{1,253}$/g.test(hostname)) {
    return false;
  }

  const isValid =
    labels.every(label => {
      return /^[a-zA-Z0-9-]{1,63}$/g.test(label) &&
      !(
        label.startsWith('-')         ||
        label.endsWith  ('-')
      )
    });

  return isValid;
}

function stringArrayToObject(stringArray) {
  if (!(stringArray instanceof Array)) {
    throw new Error("Argument must be of type Array");
  }

  if (stringArray.find(string => typeof string !== "string")) {
    throw new Error("Argument must be an array of strings");
  }

  const returnObject = {};
  for (let i = 0; i < stringArray.length; i += 2) {
    returnObject[stringArray[i]] = stringArray[i + 1];
  }

  return returnObject;
}

const show_hexy = (buf, pfx) => console.log(hexy(buf, { prefix: pfx + ' ' }));

let ctr = 0;
const auto = () => ++ctr;

const removeFormatting = string => string.replace(/§[0-9a-fk-or]/ig, "").trim();

class ConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConnectionError";
  }
}

const TimeoutPromise =
  (timeout, what) => new Promise(
    (_, reject) => setTimeout(
      () => reject(new ConnectionError(what + ": Connection timed out")),
      timeout
    )
  );

const merge = (dst, src) => {
  Object.keys(src).forEach((key) => {
    if (!dst[key]) {
      dst[key] = src[key];
    } else if (typeof src[key] === 'object' && src[key] !== null && typeof dst[key] === 'object' && dst[key] !== null) {
      merge(dst[key], src[key]);
    }
  });
};

module.exports = {
  verifyHostname,
  stringArrayToObject,
  show_hexy,
  auto,
  removeFormatting,
  ConnectionError,
  TimeoutPromise,
  merge
};
