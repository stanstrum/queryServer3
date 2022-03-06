const { show_hexy, auto, ConnectionError, TimeoutPromise } = require("@lib/helpers.js");

function udpSendUntilReceive(socket, data, interval_ms, timeout_promise) {
  const time_start = Date.now();
  let timed_out = false;

  timeout_promise.catch(() => { timed_out = true; });

  return new Promise((resolve, reject) => {
    let interval_id;

    const errorListener = error => {
      clearInterval(interval_id);
      socket.removeListener("message", messageListener);

      reject(error);

      return;
    }

    const messageListener = response => {
      clearInterval(interval_id);

      // show_hexy(response, '<');

      resolve(response);
    };

    const interval_func = () => {
      if (timed_out) {
        clearInterval(interval_id);
        socket.removeListener("message", messageListener);
        socket.removeListener("error", errorListener);

        reject(new ConnectionError("Timed out"));

        return;
      }

      // show_hexy(data, '>');

      socket.send(data);
    };

    socket.once("message", messageListener);
    socket.once("error", errorListener);

    interval_id = setInterval(interval_func, interval_ms);
    interval_func();
  });
}

module.exports = udpSendUntilReceive;
