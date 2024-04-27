const net = require("net");
const { COMMANDS, REQUEST_DATA } = require("./constants");
const timeParser = require("./timestamp_parser");

const {
  createTCPHeader,
  removeTcpHeader,
  decodeTCPHeader,
  checkNotEventTCP,
  decodeRecordData40,
  findDeviceByIp,
  findDevicesByIps,
  decodeUserData72,
  exportErrorMessage,
} = require("./utils");

class ZKLibTCP {
  constructor(devices) {
    this.connectedIps = [];

    this.devices = devices?.map((device) => ({
      ip: device.deviceIp,
      port: device.devicePort,
      timeout: 1000,
      sessionId: null,
      replyId: 0,
      socket: null,
    }));
  }

  async connectAll() {
    try {
      for (const device of this.devices) {
        await this.connectDevice(device);
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async connectDevice(device) {
    try {
      const socket = await this.createSocket(device);

      device.socket = socket;
      await this.connect(device);
    } catch (error) {
      console.log("error", error);
    }
  }

  async createSocket(device) {
    return new Promise((resolve, reject) => {
      try {
        const socket = new net.Socket();

        // Set up a timeout
        const timeoutId = setTimeout(() => {
          socket.destroy(); // Destroy the socket if connection attempt times out
          reject("");
        }, device.timeout || 1000);

        // Handle error event
        socket.once("error", (err) => {
          clearTimeout(timeoutId); // Clear the timeout
          reject(err);
        });

        // Handle connection event
        socket.once("connect", () => {
          clearTimeout(timeoutId); // Clear the timeout since connection is successful

          resolve(socket);

          this.connectedIps.push(device.ip);
        });

        // Handle socket close event
        socket.once("close", (err) => {
          clearTimeout(timeoutId); // Clear the timeout if socket closes
          device.socket = null;
        });

        // Listen for incoming data from the server

        // Start the connection
        socket.connect(device.port, device.ip);
      } catch (error) {}
    });
  }

  async connect(device) {
    try {
      const reply = await this.executeCmd(device, COMMANDS.CMD_CONNECT, "");

      if (!reply) {
        throw new Error("NO_REPLY_ON_CMD_CONNECT");
      }
    } catch (error) {}
  }

  async executeCmd(device, command, data) {
    return new Promise(async (resolve, reject) => {
      try {
        if (command === COMMANDS.CMD_CONNECT) {
          device.sessionId = 0;
          device.replyId = 0;
        } else {
          device.replyId++;
        }

        const buf = createTCPHeader(
          command,
          device.sessionId,
          device.replyId,
          data
        );

        if (device.socket) {
          const reply = await this.writeMessage(
            device.socket,
            buf,
            command === COMMANDS.CMD_CONNECT || command === COMMANDS.CMD_EXIT
          );

          const rReply = removeTcpHeader(reply);
          if (
            rReply &&
            rReply.length &&
            rReply.length >= 0 &&
            command === COMMANDS.CMD_CONNECT
          ) {
            device.sessionId = rReply.readUInt16LE(4);
          }

          resolve(rReply);
        } else {
          //   reject(new Error("SOKET_IS_NULL"));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAllConnectedIps() {
    return this.connectedIps;
  }

  async getAllDisconnectedIps(allDeviceIps) {
    if (this.connectedIps && this.connectedIps.length > 0) {
      const deviceIPs = new Set(this.connectedIps.map((ip) => ip));
      const disCon = allDeviceIps.filter((ip) => !deviceIPs.has(ip));

      return disCon && disCon.length > 0 ? disCon : null;
    } else {
      return allDeviceIps;
    }
  }

  writeMessage(socket, msg, connect) {
    return new Promise((resolve, reject) => {
      let timer = null;
      socket.once("data", (data) => {
        timer && clearTimeout(timer);
        resolve(data);
      });

      socket.write(msg, null, async (err) => {
        if (err) {
          reject(err);
        } else if (socket.timeout) {
          timer = setTimeout(
            () => {
              clearTimeout(timer);
              reject(new Error("TIMEOUT_ON_WRITING_MESSAGE"));
            },
            connect ? 2000 : socket.timeout
          );
        }
      });
    });
  }

  async getSerialNumber() {
    const keyword = "~SerialNumber";
    try {
      for (const device of this.devices) {
        const data = await this.executeCmd(device, 11, keyword);
        return data
          .slice(8)
          .toString("utf-8")
          .replace(keyword + "=", "");
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getAttendances(deviceIp, callbackInProcess = () => {}) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);

        if (device && Object.keys(device).length > 0) {
          // await this.ensureSocketConnection(device);
          const data = await this.readAttendanceLogs(
            device,
            REQUEST_DATA.GET_ATTENDANCE_LOGS,
            callbackInProcess
          );

          if (data) {
            const records = this.extractAttendanceRecords(data);

            return records;
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (err) {
      console.log("err 229", err);
      return null;
    }
  }

  async getAttendanceSize(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);

        if (device) {
          const data = await this.executeCmd(
            device,
            COMMANDS.CMD_GET_FREE_SIZES,
            ""
          );
          return data.readUIntLE(40, 4);
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async clearAttendanceLog(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);

        if (device) {
          const data = await this.executeCmd(
            device,
            COMMANDS.CMD_CLEAR_ATTLOG,
            ""
          );
          return data;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async ensureSocketConnection(device) {
    if (!device.socket) {
    }
  }

  async readAttendanceLogs(device, requestData, callbackInProcess) {
    try {
      return await this.readWithBuffer(device, requestData, callbackInProcess);
    } catch (err) {
      console.log("err 307", err);
      // throw new Error(err);
    }
  }

  readWithBuffer(device, reqData, cb = null) {
    try {
      return new Promise(async (resolve, reject) => {
        device.replyId++;
        const buf = createTCPHeader(
          COMMANDS.CMD_DATA_WRRQ,
          device.sessionId,
          device.replyId,
          reqData
        );
        let reply = null;

        try {
          const newReply = await this.requestData(device, buf);

          reply = newReply;
        } catch (err) {
          console.log(`Error at 529 line ${err}`);
          reject(err);
          return; // Exit the function if an error occurred during requestData
        }

        if (!reply) {
          reject(); // Reject the promise if reply is null or undefined
          return; // Exit the function if reply is null or undefined
        }

        const header = decodeTCPHeader(reply.subarray(0, 16));
        switch (header.commandId) {
          case COMMANDS.CMD_DATA: {
            resolve({ data: reply.subarray(16), mode: 8 });
            break;
          }
          case COMMANDS.CMD_ACK_OK:

          case COMMANDS.CMD_PREPARE_DATA: {
            // rest of your code...
          }
          default: {
            reject(
              new Error(
                "ERROR_IN_UNHANDLE_CMD " + exportErrorMessage(header.commandId)
              )
            );
          }
        }
      });
    } catch (error) {
      console.log("error", error);
      throw new Error(error);
    }
  }

  async requestData(device, msg) {
    try {
      if (device && device.socket) {
        return await new Promise((resolve, reject) => {
          let timer = null;
          let replyBuffer = Buffer.from([]);
          const internalCallback = (data_1) => {
            device.socket.removeListener("data", handleOnData);
            timer && clearTimeout(timer);
            resolve(data_1);
          };

          const handleOnData = (data_3) => {
            replyBuffer = Buffer.concat([replyBuffer, data_3]);

            if (checkNotEventTCP(data_3)) return;
            clearTimeout(timer);
            const header = decodeTCPHeader(replyBuffer.subarray(0, 16));

            if (header.commandId === COMMANDS.CMD_DATA) {
              timer = setTimeout(() => {
                internalCallback(replyBuffer);
              }, 1000);
            } else {
              timer = setTimeout(() => {
                // reject(new Error("TIMEOUT_ON_RECEIVING_REQUEST_DATA"));
                reject("");
                return;
              }, this.timeout);

              const packetLength = data_3.readUIntLE(4, 2);
              if (packetLength > 8) {
                internalCallback(data_3);
              }
            }
          };

          device.socket.on("data", handleOnData);

          device.socket.write(msg, null, (err) => {
            if (err) {
              reject(err);
            }

            timer = setTimeout(() => {
              reject("");
            }, device.timeout);
          });
        });
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  extractAttendanceRecords(data) {
    try {
      const RECORD_PACKET_SIZE = 40;
      let recordData = data.data.subarray(4);
      const records = [];

      while (recordData.length >= RECORD_PACKET_SIZE) {
        const record = decodeRecordData40(
          recordData.subarray(0, RECORD_PACKET_SIZE)
        );

        records.push({ ...record });
        recordData = recordData.subarray(RECORD_PACKET_SIZE);
      }

      return records;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async setUser(deviceIp, uid, userid, name, password, role = 0, cardno = 0) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);

        const command_string = Buffer.alloc(72);
        command_string.writeUInt32LE(uid, 0);
        command_string.writeUInt16LE(role, 2);
        command_string.write(password, 3, 8);
        command_string.write(name, 11, 24);
        command_string.writeUInt32LE(cardno, 35);
        command_string.writeUInt32LE(0, 40);
        command_string.write(userid ? userid.toString(9) : "", 48);

        await this.executeCmd(device, COMMANDS.CMD_USER_WRQ, command_string);
        //console.log(command_string);
        return true;
      } else {
        return null;
      }
    } catch (e) {
      console.log("ee", e);
      return null;
    }
  }

  async getUsers(deviceIp) {
    // Free Buffer Data to request Data

    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);

        let data = null;

        try {
          data = await this.readWithBuffer(device, REQUEST_DATA.GET_USERS);
        } catch (err) {
          return null;
        }

        // Free Buffer Data after requesting data
        const USER_PACKET_SIZE = 72;

        let userData = data.data.subarray(4);

        let users = [];

        while (userData.length >= USER_PACKET_SIZE) {
          const user = decodeUserData72(userData.subarray(0, USER_PACKET_SIZE));
          users.push(user);
          userData = userData.subarray(USER_PACKET_SIZE);
        }

        return users;
      } else {
        return null;
      }
    } catch (error) {
      console.log("error", error);
      throw new Error(error);
    }
  }

  async clearUsers(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);
        const data = await this.executeCmd(
          device,
          COMMANDS.CMD_CLEAR_ADMIN,
          ""
        );
        console.log("data", data);
      } else {
        return null;
      }
    } catch (err) {
      console.log("err", err);
      return null;
    }
  }

  async getInfo(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);
        const data = await this.executeCmd(
          device,
          COMMANDS.CMD_GET_FREE_SIZES,
          ""
        );

        return {
          userCounts: data.readUIntLE(24, 4),

          logCounts: data.readUIntLE(40, 4),

          logCapacity: data.readUIntLE(72, 4),
        };
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  async getTime(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);
        const t = await this.executeCmd(device, COMMANDS.CMD_GET_TIME, "");

        return timeParser.decode(t.readUInt32LE(8));
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  async getAllConnectedDevices() {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const devices = [];
        for (const device of connectedDevices) {
          const getTime = await this.getTime(device.ip);
          const getInfo = await this.getInfo(device.ip);

          devices.push({ deviceTime: getTime, ...getInfo });
        }

        return devices;
      } else {
        return null;
      }
    } catch (error) {
      // console.log("error", error);
      throw new Error(error);
    }
  }

  async getPIN(deviceIp) {
    const keyword = "~PIN2Width";
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);
        const data = await this.executeCmd(
          device,
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword
        );

        return data
          .slice(8)
          .toString("ascii")
          .replace(keyword + "=", "");
      } else {
        return null;
      }
    } catch (err) {
      console.log("err", err);
      return null;
    }
  }

  async shutdown(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);
        const t = await this.executeCmd(device, COMMANDS.CMD_POWEROFF, "");

        return timeParser.decode(t.readUInt32LE(8));
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  async restart(deviceIp) {
    try {
      const connectedDevices = await findDevicesByIps(
        this.devices,
        this.connectedIps
      );

      if (connectedDevices && connectedDevices.length > 0) {
        const device = await findDeviceByIp(connectedDevices, deviceIp);
        const t = await this.executeCmd(device, COMMANDS.CMD_RESTART, "");

        return timeParser.decode(t.readUInt32LE(8));
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }
}

module.exports = ZKLibTCP;
