const dgram = require("dgram");
const { createUDPHeader } = require("./utils");
const { COMMANDS } = require("./constants");

class ZKLibUDP {
  constructor(ip, port, timeout, inport) {
    this.ip = ip;
    this.port = port;
    this.timeout = timeout;
    this.inport = inport;
    this.socket = null;
    this.sessionId = null;
    this.replyId = 0;
  }

  createSocket(cbError, cbClose) {
    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket("udp4");
      this.socket.setMaxListeners(Infinity);
      this.socket.once("error", (err) => {
        reject(err);
        cbError && cbError(err);
      });

      this.socket.on("close", (err) => {
        this.socket = null;
        cbClose && cbClose("udp");
      });

      this.socket.once("listening", () => {
        resolve(this.socket);
      });

      try {
        this.socket.bind(this.inport);
      } catch (err) {}
    });
  }

  async connect() {
    try {
      const reply = await this.executeCmd(COMMANDS.CMD_CONNECT, "");
      return reply ? true : false;
    } catch (err) {
      throw err;
    }
  }

  closeSocket() {
    return new Promise((resolve, reject) => {
      this.socket?.removeAllListeners("message");
      this.socket?.close(() => {
        clearTimeout(timer);
        resolve(true);
      });

      const timer = setTimeout(() => {
        resolve(true);
      }, 2000);
    });
  }

  writeMessage(msg, connect) {
    return new Promise((resolve, reject) => {
      let sendTimeoutId = null;

      this.socket?.once("message", (data) => {
        sendTimeoutId && clearTimeout(sendTimeoutId);
        resolve(data);
      });

      this.socket?.send(msg, 0, msg.length, this.port, this.ip, (err) => {
        if (err) {
          reject(err);
        }
        if (this.timeout) {
          sendTimeoutId = setTimeout(
            () => {
              clearTimeout(sendTimeoutId);
              reject(new Error("TIMEOUT_ON_WRITING_MESSAGE"));
            },
            connect ? 2000 : this.timeout
          );
        }
      });
    });
  }

  executeCmd(command, data) {
    return new Promise(async (resolve, reject) => {
      try {
        if (command === COMMANDS.CMD_CONNECT) {
          this.sessionId = 0;
          this.replyId = 0;
        } else {
          this.replyId++;
        }

        const buf = createUDPHeader(
          command,
          this.sessionId,
          this.replyId,
          data
        );
        const reply = await this.writeMessage(
          buf,
          command === COMMANDS.CMD_CONNECT || command === COMMANDS.CMD_EXIT
        );

        if (reply && reply.length && reply.length >= 0) {
          if (command === COMMANDS.CMD_CONNECT) {
            this.sessionId = reply.readUInt16LE(4);
          }
        }
        resolve(reply);
      } catch (err) {
        reject(err);
      }
    });
  }

  async disconnect() {
    try {
      await this.executeCmd(COMMANDS.CMD_EXIT, "");
    } catch (err) {
      // Handle or ignore error, if necessary
    }
    return await this.closeSocket();
  }
}

module.exports = ZKLibUDP;
