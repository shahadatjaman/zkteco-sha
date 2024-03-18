const net = require("net");
const { MAX_CHUNK, COMMANDS, REQUEST_DATA } = require("./constants");
const timeParser = require("./timestamp_parser");
const {
  createTCPHeader,
  exportErrorMessage,

  decodeUserData72,
  decodeRecordData40,
  decodeRecordRealTimeLog52,
  checkNotEventTCP,
  decodeTCPHeader,
  removeTcpHeader,
} = require("./utils");

const { log } = require("./helpers/errorLog");

class ZKLibTCP {
  constructor(ip, port, timeout) {
    this.ip = ip;
    this.port = port;
    this.timeout = timeout;
    this.sessionId = null;
    this.replyId = 0;
    this.socket = null;
  }

  /**
   * Establishes a TCP socket, handling errors, connection, and closure events,
   * and returns a promise with optional error and closure callbacks.
   *
   * @param {Function} cbError - Error callback (optional).
   * @param {Function} cbClose - Closure callback (optional).
   * @returns {Promise<net.Socket>} - A promise resolving to the socket object.
   */
  createSocket(cbError, cbClose) {
    console.log(this.ip);
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.once("error", (err) => {
        reject(err);
        cbError && cbError(err);
      });

      this.socket.once("connect", () => {
        resolve(this.socket);
      });

      this.socket.once("close", (err) => {
        this.socket = null;
        cbClose && cbClose("tcp");
      });

      if (this.timeout) {
        this.socket.setTimeout(this.timeout);
      }

      this.socket.connect(this.port, this.ip);
    });
  }

  /**
   * Initiates a connection, resolving to true if successful, otherwise rejecting with an error.
   *
   * @returns {Promise<boolean>} - A promise resolving to true if the connection is successful.
   */
  connect() {
    return new Promise(async (resolve, reject) => {
      try {
        const reply = await this.executeCmd(COMMANDS.CMD_CONNECT, "");
        reply ? resolve(true) : reject(new Error("NO_REPLY_ON_CMD_CONNECT"));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Closes the socket, resolving to true if successful, with a timeout for handling disconnection issues.
   *
   * @returns {Promise<boolean>} - A promise resolving to true if the socket is successfully closed.
   */
  closeSocket() {
    return new Promise((resolve, reject) => {
      this.socket.removeAllListeners("data");
      this.socket.end(() => {
        clearTimeout(timer);
        resolve(true);
      });
      // Handles cases where the socket isn't connected by setting a timeout
      const timer = setTimeout(() => {
        resolve(true);
      }, 2000);
    });
  }

  /**
   * Writes a message to the socket, resolving with the response if successful, with an optional timeout.
   *
   * @param {string} msg - The message to write.
   * @param {boolean} connect - Indicates whether the message is for connection establishment (optional).
   * @returns {Promise<any>} - A promise resolving with the response data.
   */
  writeMessage(msg, connect) {
    return new Promise((resolve, reject) => {
      let timer = null;
      this.socket.once("data", (data) => {
        timer && clearTimeout(timer);
        resolve(data);
      });

      this.socket.write(msg, null, async (err) => {
        if (err) {
          reject(err);
        } else if (this.timeout) {
          timer = setTimeout(
            () => {
              clearTimeout(timer);
              reject(new Error("TIMEOUT_ON_WRITING_MESSAGE"));
            },
            connect ? 2000 : this.timeout
          );
        }
      });
    });
  }

  /**
   * Requests data from the socket, resolving with the response if successful, with an optional timeout.
   *
   * @param {string} msg - The message to send as a request.
   * @returns {Promise<Buffer>} - A promise resolving with the received data buffer.
   */
  requestData(msg) {
    return new Promise((resolve, reject) => {
      let timer = null;
      let replyBuffer = Buffer.from([]);
      const internalCallback = (data) => {
        this.socket.removeListener("data", handleOnData);
        timer && clearTimeout(timer);
        resolve(data);
      };

      const handleOnData = (data) => {
        replyBuffer = Buffer.concat([replyBuffer, data]);
        if (checkNotEventTCP(data)) return;
        clearTimeout(timer);
        const header = decodeTCPHeader(replyBuffer.subarray(0, 16));

        if (header.commandId === COMMANDS.CMD_DATA) {
          timer = setTimeout(() => {
            internalCallback(replyBuffer);
          }, 1000);
        } else {
          timer = setTimeout(() => {
            reject(new Error("TIMEOUT_ON_RECEIVING_REQUEST_DATA"));
          }, this.timeout);

          const packetLength = data.readUIntLE(4, 2);
          if (packetLength > 8) {
            internalCallback(data);
          }
        }
      };

      this.socket.on("data", handleOnData);

      this.socket.write(msg, null, (err) => {
        if (err) {
          reject(err);
        }

        timer = setTimeout(() => {
          reject(Error("TIMEOUT_IN_RECEIVING_RESPONSE_AFTER_REQUESTING_DATA"));
        }, this.timeout);
      });
    }).catch(() => {
      console.log("Promise Rejected");
    });
  }

  /**
   *
   * @param {*} command
   * @param {*} data
   *
   *
   * reject error when command fail and resolve data when success
   */

  executeCmd(command, data) {
    return new Promise(async (resolve, reject) => {
      if (command === COMMANDS.CMD_CONNECT) {
        this.sessionId = 0;
        this.replyId = 0;
      } else {
        this.replyId++;
      }
      const buf = createTCPHeader(command, this.sessionId, this.replyId, data);
      let reply = null;

      try {
        reply = await this.writeMessage(
          buf,
          command === COMMANDS.CMD_CONNECT || command === COMMANDS.CMD_EXIT
        );

        const rReply = removeTcpHeader(reply);
        if (rReply && rReply.length && rReply.length >= 0) {
          if (command === COMMANDS.CMD_CONNECT) {
            this.sessionId = rReply.readUInt16LE(4);
          }
        }
        resolve(rReply);
      } catch (err) {
        reject(err);
      }
    });
  }
  /**
   * Sends a chunk request to the socket.
   *
   * @param {number} start - The starting position of the requested chunk.
   * @param {number} size - The size of the requested chunk.
   */
  sendChunkRequest(start, size) {
    this.replyId++;
    const reqData = Buffer.alloc(8);
    reqData.writeUInt32LE(start, 0);
    reqData.writeUInt32LE(size, 4);
    const buf = createTCPHeader(
      COMMANDS.CMD_DATA_RDY,
      this.sessionId,
      this.replyId,
      reqData
    );

    this.socket.write(buf, null, (err) => {
      if (err) {
        log(`[TCP][SEND_CHUNK_REQUEST]` + err.toString());
      }
    });
  }

  /**
   *
   * @param {*} reqData - indicate the type of data that need to receive ( user or attLog)
   * @param {*} cb - callback is triggered when receiving packets
   *
   * readWithBuffer will reject error if it'wrong when starting request data
   * readWithBuffer will return { data: replyData , err: Error } when receiving requested data
   */
  readWithBuffer(reqData, cb = null) {
    return new Promise(async (resolve, reject) => {
      try {
        this.replyId++;
        const buf = createTCPHeader(
          COMMANDS.CMD_DATA_WRRQ,
          this.sessionId,
          this.replyId,
          reqData
        );
        let reply = null;

        try {
          reply = await this.requestData(buf);
          //console.log(reply.toString('hex'));
        } catch (err) {
          reject("err_no 1154");
          console.log(reply);
        }

        const header = decodeTCPHeader(reply?.subarray(0, 16));
        if (header) {
          switch (header.commandId) {
            case COMMANDS.CMD_DATA: {
              resolve({ data: reply.subarray(16), mode: 8 });
              break;
            }
            case COMMANDS.CMD_ACK_OK:
            case COMMANDS.CMD_PREPARE_DATA: {
              // this case show that data is prepared => send command to get these data
              // reply variable includes information about the size of following data
              const recvData = reply.subarray(16);
              const size = recvData.readUIntLE(1, 4);

              // We need to split the data to many chunks to receive , because it's to large
              // After receiving all chunk data , we concat it to TotalBuffer variable , that 's the data we want
              let remain = size % MAX_CHUNK;
              let numberChunks = Math.round(size - remain) / MAX_CHUNK;
              let totalPackets = numberChunks + (remain > 0 ? 1 : 0);
              let replyData = Buffer.from([]);

              let totalBuffer = Buffer.from([]);
              let realTotalBuffer = Buffer.from([]);

              const timeout = 10000;
              let timer = setTimeout(() => {
                internalCallback(
                  replyData,
                  new Error("TIMEOUT WHEN RECEIVING PACKET")
                );
              }, timeout);

              const internalCallback = (replyData, err = null) => {
                // this.socket && this.socket.removeListener('data', handleOnData)
                timer && clearTimeout(timer);
                resolve({ data: replyData, err });
              };

              const handleOnData = (reply) => {
                if (checkNotEventTCP(reply)) return;
                clearTimeout(timer);
                timer = setTimeout(() => {
                  internalCallback(
                    replyData,
                    new Error(`TIME OUT !! ${totalPackets} PACKETS REMAIN !`)
                  );
                }, timeout);

                totalBuffer = Buffer.concat([totalBuffer, reply]);
                const packetLength = totalBuffer.readUIntLE(4, 2);
                if (totalBuffer.length >= 8 + packetLength) {
                  realTotalBuffer = Buffer.concat([
                    realTotalBuffer,
                    totalBuffer.subarray(16, 8 + packetLength),
                  ]);
                  totalBuffer = totalBuffer.subarray(8 + packetLength);

                  if (
                    (totalPackets > 1 &&
                      realTotalBuffer.length === MAX_CHUNK + 8) ||
                    (totalPackets === 1 &&
                      realTotalBuffer.length === remain + 8)
                  ) {
                    replyData = Buffer.concat([
                      replyData,
                      realTotalBuffer.subarray(8),
                    ]);
                    totalBuffer = Buffer.from([]);
                    realTotalBuffer = Buffer.from([]);

                    totalPackets -= 1;
                    cb && cb(replyData.length, size);

                    if (totalPackets <= 0) {
                      internalCallback(replyData);
                    }
                  }
                }
              };

              this.socket.once("close", () => {
                internalCallback(
                  replyData,
                  new Error("Socket is disconnected unexpectedly")
                );
              });

              this.socket.on("data", handleOnData);

              for (let i = 0; i <= numberChunks; i++) {
                if (i === numberChunks) {
                  this.sendChunkRequest(numberChunks * MAX_CHUNK, remain);
                } else {
                  this.sendChunkRequest(i * MAX_CHUNK, MAX_CHUNK);
                }
              }

              break;
            }
            default: {
              reject(
                new Error(
                  "ERROR_IN_UNHANDLE_CMD " +
                    exportErrorMessage(header.commandId)
                )
              );
            }
          }
        }
      } catch (error) {
        console.log("err_no 6425");
      }
    });
  }

  async getSmallAttendanceLogs() {}

  /**
   * Retrieves users' data.
   * Rejects error when starting request data.
   * Returns { data: users, err: Error } when receiving requested data.
   *
   * @returns {Promise<{ data: any[], err: Error }>} - A promise resolving with the users' data or an error.
   */
  async getUsers() {
    // Free Buffer Data to request Data
    if (this.socket) {
      try {
        await this.freeData();
      } catch (err) {
        return { data: null, err };
      }
    }

    let data = null;
    try {
      data = await this.readWithBuffer(REQUEST_DATA.GET_USERS);
    } catch (err) {
      return { data: null, err };
    }

    // Free Buffer Data after requesting data
    if (this.socket) {
      try {
        await this.freeData();
      } catch (err) {
        return { data: null, err };
      }
    }

    const USER_PACKET_SIZE = 72;

    let userData = data.data.subarray(4);

    let users = [];

    while (userData.length >= USER_PACKET_SIZE) {
      const user = decodeUserData72(userData.subarray(0, USER_PACKET_SIZE));
      users.push(user);
      userData = userData.subarray(USER_PACKET_SIZE);
    }

    return { data: users, err: null };
  }

  /**
   *
   * @param {*} ip
   * @param {*} callbackInProcess
   *  reject error when starting request data
   *  return { data: records, err: Error } when receiving requested data
   */

  async getAttendances(callbackInProcess = () => {}) {
    if (this.socket) {
      try {
        await this.freeData();
      } catch (err) {
        return Promise.reject(err);
      }
    }

    let data = null;
    try {
      data = await this.readWithBuffer(
        REQUEST_DATA.GET_ATTENDANCE_LOGS,
        callbackInProcess
      );
    } catch (err) {
      return Promise.reject(err);
    }

    if (this.socket) {
      try {
        await this.freeData();
      } catch (err) {
        return Promise.reject(err);
      }
    }

    const RECORD_PACKET_SIZE = 40;

    let recordData = data.data.subarray(4);
    let records = [];
    while (recordData.length >= RECORD_PACKET_SIZE) {
      const record = decodeRecordData40(
        recordData.subarray(0, RECORD_PACKET_SIZE)
      );
      records.push({ ...record, ip: this.ip });
      recordData = recordData.subarray(RECORD_PACKET_SIZE);
    }

    return { data: records };
  }

  async freeData() {
    return await this.executeCmd(COMMANDS.CMD_FREE_DATA, "");
  }

  async disableDevice() {
    return await this.executeCmd(
      COMMANDS.CMD_DISABLEDEVICE,
      REQUEST_DATA.DISABLE_DEVICE
    );
  }

  async enableDevice() {
    return await this.executeCmd(COMMANDS.CMD_ENABLEDEVICE, "");
  }

  async disableDevice() {
    return await this.executeCmd(COMMANDS.CMD_DISABLEDEVICE, "");
  }

  /**
   * Disconnects from the socket and closes it.
   *
   * @returns {Promise<boolean>} - A promise resolving to true if disconnection is successful.
   */
  async disconnect() {
    try {
      await this.executeCmd(COMMANDS.CMD_EXIT, "");
    } catch (err) {}
    return await this.closeSocket();
  }

  /**
   * Powers off the device.
   *
   * @returns {Promise<void>} - A promise that resolves if the power off command is successful, otherwise rejects with an error.
   */
  async powerOff() {
    try {
      await this.executeCmd(COMMANDS.CMD_POWEROFF, "");
    } catch (err) {
      return Promise.reject(err);
    }
  }
  /**
   * Puts the device into sleep mode.
   *
   * @returns {Promise<void>} - A promise that resolves if the sleep command is successful, otherwise rejects with an error.
   */
  async sleep() {
    try {
      await this.executeCmd(COMMANDS.CMD_SLEEP, "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Restarts the device.
   *
   * @returns {Promise<void>} - A promise that resolves if the restart command is successful, otherwise rejects with an error.
   */
  async restart() {
    try {
      await this.executeCmd(COMMANDS.CMD_RESTART, "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves device information.
   *
   * @returns {Promise<{ userCounts: number, logCounts: number, logCapacity: number }>} - A promise resolving with device information.
   */
  async getInfo() {
    try {
      const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, "");

      return {
        userCounts: data.readUIntLE(24, 4),
        logCounts: data.readUIntLE(40, 4),
        logCapacity: data.readUIntLE(72, 4),
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the serial number of the device.
   *
   * @returns {Promise<string>} - A promise resolving with the serial number.
   */
  async getSerialNumber() {
    const keyword = "~SerialNumber";
    try {
      const data = await this.executeCmd(11, keyword);
      return data
        .slice(8)
        .toString("utf-8")
        .replace(keyword + "=", "");
    } catch (err) {
      console.log("err", err);
    }
  }

  /**
   * Retrieves the device version.
   *
   * @returns {Promise<string>} - A promise resolving with the device version.
   */
  async getDeviceVersion() {
    const keyword = "~ZKFPVersion";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the device name.
   *
   * @returns {Promise<string>} - A promise resolving with the device name.
   */
  async getDeviceName() {
    const keyword = "~DeviceName";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the device platform.
   *
   * @returns {Promise<string>} - A promise resolving with the device platform.
   */
  async getPlatform() {
    const keyword = "~Platform";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the device operating system.
   *
   * @returns {Promise<string>} - A promise resolving with the device operating system.
   */
  async getOS() {
    const keyword = "~OS";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }
  /**
   * Retrieves the work code settings.
   *
   * @returns {Promise<string>} - A promise resolving with the work code settings.
   */
  async getWorkCode() {
    const keyword = "WorkCode";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the PIN settings.
   *
   * @returns {Promise<string>} - A promise resolving with the PIN settings.
   */
  async getPIN() {
    const keyword = "~PIN2Width";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves whether the face recognition feature is enabled.
   *
   * @returns {Promise<string>} - A promise resolving with the status of the face recognition feature.
   */
  async getFaceOn() {
    const keyword = "FaceFunOn";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);
      if (
        data
          .slice(8)
          .toString("ascii")
          .replace(keyword + "=", "")
          .includes("0")
      )
        return "No";
      else return "Yes";
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the SSR setting.
   *
   * @returns {Promise<string>} - A promise resolving with the SSR setting.
   */
  async getSSR() {
    const keyword = "~SSR";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the firmware version of the device.
   *
   * @returns {Promise<string>} - A promise resolving with the firmware version.
   */
  async getFirmware() {
    try {
      const data = await this.executeCmd(1100, "");

      return data.slice(8).toString("ascii");
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Retrieves the current time from the device.
   *
   * @returns {Promise<Date>} - A promise resolving with the current time.
   */
  async getTime() {
    try {
      const t = await this.executeCmd(COMMANDS.CMD_GET_TIME, "");
      return timeParser.decode(t.readUInt32LE(8));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Sets a user with provided details.
   *
   * @param {number} uid - User ID.
   * @param {string} userid - User identification.
   * @param {string} name - User name.
   * @param {string} password - User password.
   * @param {number} role - User role (default: 0).
   * @param {string} cardno - User card number (default: '').
   * @returns {Promise<boolean>} - A promise resolving with true if user is set successfully, otherwise false.
   */
  async setUser(uid, userid, name, password, role = 0, cardno = "", deviceIP) {
    try {
      const MAX_UID = 3000;
      const MAX_USERID_LENGTH = 9;
      const MAX_NAME_LENGTH = 24;
      const MAX_PASSWORD_LENGTH = 8;
      const MAX_CARDNO_LENGTH = 7;
      const MAX_CARDNO_VALUE = 9999999;

      if (
        parseInt(uid) === 0 ||
        parseInt(uid) > MAX_UID ||
        userid.length > MAX_USERID_LENGTH ||
        name.length > MAX_NAME_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH ||
        cardno.length > MAX_CARDNO_LENGTH
      ) {
        return false;
      }

      if (parseInt(cardno) > MAX_CARDNO_VALUE) {
        return false;
      }

      const commandString = Buffer.alloc(72);
      commandString.writeUInt16LE(uid, 0);
      commandString.writeUInt16LE(role, 2);
      commandString.write(password, 3, MAX_PASSWORD_LENGTH);
      commandString.write(name, 11, MAX_NAME_LENGTH);
      commandString.writeUInt32LE(parseInt(cardno), 35); // Write as 32-bit unsigned integer
      commandString.writeUInt32LE(0, 40);
      commandString.write(userid ? userid.toString(9) : "", 48);

      return await this.executeCmd(COMMANDS.CMD_USER_WRQ, commandString);
    } catch (error) {
      console.error("Error occurred while setting user:", error);
      return false;
    }
  }

  /**
   * Retrieves the size of the attendance log.
   *
   * @returns {Promise<number>} - A promise resolving with the size of the attendance log.
   */
  async getAttendanceSize() {
    try {
      const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, "");
      return data.readUIntLE(40, 4);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Clears the attendance log.
   *
   * @returns {Promise<void>} - A promise that resolves when the attendance log is cleared.
   */
  async clearAttendanceLog() {
    return await this.executeCmd(COMMANDS.CMD_CLEAR_ATTLOG, "");
  }

  /**
   * Retrieves real-time logs with an optional callback.
   *
   * @param {Function} cb - Optional callback function for real-time log data.
   */
  async getRealTimeLogs(cb = () => {}) {
    this.replyId++;

    try {
      const buf = createTCPHeader(
        COMMANDS.CMD_REG_EVENT,
        this.sessionId,
        this.replyId,
        Buffer.from([0x01, 0x00, 0x00, 0x00])
      );

      this.socket.write(buf, null, (err) => {});

      if (this.socket.listenerCount("data") === 0) {
        this.socket.on("data", (data) => {
          if (!checkNotEventTCP(data)) return;
          if (data.length > 16) {
            cb(decodeRecordRealTimeLog52(data));
          }
        });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async freeData() {
    return await this.executeCmd(COMMANDS.CMD_FREE_DATA, "");
  }

  async getInfo() {
    try {
      const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, "");

      return {
        userCounts: data.readUIntLE(24, 4),
        logCounts: data.readUIntLE(40, 4),
        logCapacity: data.readUIntLE(72, 4),
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getDeviceVersion() {
    const keyword = "~ZKFPVersion";
    try {
      const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

      return data
        .slice(8)
        .toString("ascii")
        .replace(keyword + "=", "");
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async getAttendances(callbackInProcess = () => {}) {
    if (this.socket) {
      try {
        await this.freeData();
      } catch (err) {
        return Promise.reject(err);
      }
    }

    let data = null;
    try {
      data = await this.readWithBuffer(
        REQUEST_DATA.GET_ATTENDANCE_LOGS,
        callbackInProcess
      );
    } catch (err) {
      return Promise.reject(err);
    }

    if (this.socket) {
      try {
        await this.freeData();
      } catch (err) {
        return Promise.reject(err);
      }
    }

    const RECORD_PACKET_SIZE = 40;

    let recordData = data.data.subarray(4);
    let records = [];
    while (recordData.length >= RECORD_PACKET_SIZE) {
      const record = decodeRecordData40(
        recordData.subarray(0, RECORD_PACKET_SIZE)
      );
      records.push({ ...record, ip: this.ip });
      recordData = recordData.subarray(RECORD_PACKET_SIZE);
    }

    return { data: records };
  }
  async clearAttendanceLog() {
    return await this.executeCmd(COMMANDS.CMD_CLEAR_ATTLOG, "");
  }
}

module.exports = ZKLibTCP;
