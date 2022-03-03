const { show_hexy, auto, ConnectionError, TimeoutPromise } = require("@lib/helpers.js");

function udpSendUntilReceive(socket, data, interval_ms, timeout_promise) {
  const time_start = Date.now();
  let timed_out = false;

  timeout_promise.catch(() => { timed_out = true; });

  return new Promise((resolve, reject) => {
    let interval_id;

    const listener = response => {
      show_hexy(response, '<');

      clearInterval(interval_id);

      resolve(response);
    };

    const interval_func = () => {
      if (timed_out) {
        clearInterval(interval_id);
        socket.removeListener("data", listener);

        reject(new ConnectionError("Timed out"));

        return;
      }

      show_hexy(data, '>');
      socket.send(data);
    };

    socket.once("data", listener);
    interval_func();
    interval_id = setInterval(interval_func, interval_ms);
  });
}

module.exports = udpSendUntilReceive;
