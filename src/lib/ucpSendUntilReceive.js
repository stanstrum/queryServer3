const { show_hexy, auto } = require("@lib/helpers.js");

const { ConnectionError } = require("@static/globals.js");

function ucpSendUntilReceive(socket, data, interval, timeout) {
  const id = auto();

  console.log(id + " USUR");

  const sendPromise = new Promise((resolve, reject) => {
    const send = () => {
      show_hexy(data, id + ' >');
      try {
        socket.send(data);
      } catch (e) {
        console.error(e.stack);
      }
    };

    const sendInterval = setInterval(send, interval);
    send();

    const cancelTimeout = setTimeout(() => {
      reject(new ConnectionError("Connection timed out"));
    }, timeout);

    socket.on("close", () => {
      console.log(id + " USUR close");

      clearTimeout(cancelTimeout);
      clearInterval(sendInterval);
    });

    socket.on("error", e => {
      reject(new ConnectionError("Socket error:" + e.message));
    });

    socket.once("message", response => {
      show_hexy(response, id + ' <');

      resolve(response.slice());
    });
  });

  return sendPromise.finally(() => { console.log(id + " USUR finally"); socket.close(); });
}

module.exports = ucpSendUntilReceive;
