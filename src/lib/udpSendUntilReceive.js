const { show_hexy, auto, TimeoutPromise } = require("@lib/helpers.js");
const { ConnectionError } = require("@static/globals.js");

function udpSendUntilReceive(socket, data, interval, timeoutPromise) {
  const timeStart = Date.now();
  let timed_out = false;

  timeoutPromise.catch(() => { timed_out = true; });

  return new Promise((resolve, reject) => {
    let intervalID;

    const listener = data => {
      clearInterval(intervalID);

      resolve(data);
    };

    socket.once("data", listener);

    intervalID = setInterval(() => {
      if (timed_out) {
        clearInterval(intervalID);
        socket.removeListener("data", listener);

        reject(new ConnectionError("Timed out"));

        return;
      }

      socket.send(data);
    }, interval);
  });
}

module.exports = udpSendUntilReceive;
