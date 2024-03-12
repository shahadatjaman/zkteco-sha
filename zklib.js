const ZKLibTCP = require("./zklibtcp");
const ZKLibUDP = require("./zklibudp");

const { ZKError, ERROR_TYPES } = require("./zkerror");

/**
 * Creates a new ZKLibClient instance with TCP and UDP connections.
 *
 * @param {string} ip - The IP address of the device.
 * @param {number} port - The port number.
 * @param {number} timeout - The timeout duration.
 * @param {number} inport - The input port number for UDP connection.
 */

class ZKLib {
  /**
   * Creates a new ZKLibClient instance with TCP and UDP connections.
   *
   * @param {string} ip - The IP address of the device.
   * @param {number} port - The port number.
   * @param {number} timeout - The timeout duration.
   * @param {number} inport - The input port number for UDP connection.
   */
  constructor(ip, port, timeout, inport) {
    this.connectionType = null;
    this.zklibTcp = new ZKLibTCP(ip, port, timeout);
    this.zklibUdp = new ZKLibUDP(ip, port, timeout, inport);
    this.interval = null;
    this.timer = null;
    this.isBusy = false;
    this.ip = ip;
    this.port = port;
    this.status = "";
  }

  /**
   * Wraps TCP and UDP callbacks based on the connection type.
   *
   * @param {Function} tcpCallback - TCP callback function.
   * @param {Function} udpCallback - UDP callback function.
   * @param {string} command - Command being executed.
   * @returns {Promise<any>} - Resolves with the result of the callback execution.
   */
  async functionWrapper(tcpCallback, udpCallback, command) {
    try {
      switch (this.connectionType) {
        case "tcp":
          if (!this.zklibTcp.socket)
            throw new ZKError(
              new Error(`Socket isn't connected !`),
              `[TCP]`,
              this.ip
            );
          return await tcpCallback();
        case "udp":
          if (!this.zklibUdp.socket)
            throw new ZKError(
              new Error(`Socket isn't connected !`),
              `[UDP]`,
              this.ip
            );
          return await udpCallback();
        default:
          throw new ZKError(new Error(`Socket isn't connected!`), "", this.ip);
      }
    } catch (err) {
      return Promise.reject(
        new ZKError(
          err,
          `[${this.connectionType.toUpperCase()}] ${command}`,
          this.ip
        )
      );
    }
  }

  /**
   * Creates and establishes a socket connection, prioritizing TCP and falling back to UDP if TCP connection fails.
   *
   * @param {Function} cbErr(optional) - Error callback function.
   * @param {Function} cbClose(optional) - Close callback function.
   * @returns {Promise<void>} - A promise that resolves when the socket connection is established.
   */
  async createSocket(cbErr, cbClose) {
    try {
      if (!this.zklibTcp.socket) {
        await this.zklibTcp.createSocket(cbErr, cbClose);
        await this.zklibTcp.connect();
        console.log("ok tcp");
      }
      this.connectionType = "tcp";
      this.status = "connected";
    } catch (errToConnect) {
      console.log(`🐞 connect ETIMEDOUT ${this.ip}:${this.port}`);
      this.status = "disconnected";
      try {
        await this.zklibTcp.disconnect();
      } catch (errToDisconnect) {
        console.log("errToDisconnect", errToDisconnect);
      }

      if (errToConnect.code !== ERROR_TYPES.ECONNREFUSED) {
        // return Promise.reject(new ZKError(err, "TCP CONNECT", this.ip));
      }

      // try {
      //   if (!this.zklibUdp.socket) {
      //     await this.zklibUdp.createSocket(cbErr, cbClose);
      //     await this.zklibUdp.connect();
      //   }
      //   console.log("ok udp");
      //   this.connectionType = "udp";
      // } catch (err) {
      //   if (err.code !== "EADDRINUSE") {
      //     this.connectionType = null;
      //     try {
      //       await this.zklibUdp.disconnect();
      //       this.zklibUdp.socket = null;
      //       this.zklibTcp.socket = null;
      //     } catch (err) {}
      //     // return Promise.reject(new ZKError(err, "UDP CONNECT", this.ip));
      //   } else {
      //     this.connectionType = "udp";
      //   }
      // }
    }
  }

  async getStatus() {
    return this.status;
  }
  /**
   * Retrieves user data, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with user data.
   */
  async getUsers() {
    return await this.functionWrapper(
      () => this.zklibTcp.getUsers(),
      () => this.zklibUdp.getUsers()
    );
  }

  /**
   * Retrieves the device time, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the device time.
   */
  async getTime() {
    return await this.functionWrapper(
      () => this.zklibTcp.getTime(),
      () => this.zklibUdp.getTime()
    );
  }

  /**
   * Retrieves the serial number of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device serial number.
   */
  async getSerialNumber() {
    return await this.functionWrapper(() => this.zklibTcp.getSerialNumber());
  }

  /**
   * Retrieves the device version, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device version.
   */
  async getDeviceVersion() {
    return await this.functionWrapper(() => this.zklibTcp.getDeviceVersion());
  }

  /**
   * Retrieves the device name, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device name.
   */
  async getDeviceName() {
    return await this.functionWrapper(() => this.zklibTcp.getDeviceName());
  }

  /**
   * Retrieves the platform information of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the platform information.
   */
  async getPlatform() {
    return await this.functionWrapper(() => this.zklibTcp.getPlatform());
  }

  /**
   * Retrieves the operating system information of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the operating system information.
   */
  async getOS() {
    return await this.functionWrapper(() => this.zklibTcp.getOS());
  }

  /**
   * Retrieves work code information, using TCP.
   *
   * @returns {Promise<any>} - Resolves with work code information.
   */
  async getWorkCode() {
    return await this.functionWrapper(() => this.zklibTcp.getWorkCode());
  }

  /**
   * Retrieves PIN information, using TCP.
   *
   * @returns {Promise<any>} - Resolves with PIN information.
   */
  async getPIN() {
    return await this.functionWrapper(() => this.zklibTcp.getPIN());
  }

  /**
   * Retrieves face recognition status, using TCP.
   *
   * @returns {Promise<string>} - Resolves with "Yes" if face recognition is enabled, otherwise "No".
   */
  async getFaceOn() {
    return await this.functionWrapper(() => this.zklibTcp.getFaceOn());
  }

  /**
   * Retrieves SSR information, using TCP.
   *
   * @returns {Promise<any>} - Resolves with SSR information.
   */
  async getSSR() {
    return await this.functionWrapper(() => this.zklibTcp.getSSR());
  }

  /**
   * Retrieves the firmware version of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the firmware version.
   */
  async getFirmware() {
    return await this.functionWrapper(() => this.zklibTcp.getFirmware());
  }

  /**
   * Sets user information, using TCP.
   *
   * @param {number} uid - User ID.
   * @param {string} userid - User ID.
   * @param {string} name - User name.
   * @param {string} password - User password.
   * @param {number} [role=0] - User role (optional, default is 0).
   * @param {string} [cardno=''] - Card number (optional, default is "").
   * @returns {Promise<any>} - Resolves with the result of setting user information.
   */
  async setUser(uid, userid, name, password, role = 0, cardno = "") {
    return await this.functionWrapper(() =>
      this.zklibTcp.setUser(uid, userid, name, password, role, cardno)
    );
  }

  /**
   * Retrieves the size of attendance logs, using TCP.
   *
   * @returns {Promise<number>} - Resolves with the size of attendance logs.
   */
  async getAttendanceSize() {
    return await this.functionWrapper(() => this.zklibTcp.getAttendanceSize());
  }

  /**
   * Retrieves attendance data, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @param {Function} cb - Callback function to handle attendance data.
   * @returns {Promise<any>} - Resolves with attendance data.
   */
  async getAttendances(cb) {
    return await this.functionWrapper(
      () => this.zklibTcp.getAttendances(cb),
      () => this.zklibUdp.getAttendances(cb)
    );
  }

  /**
   * Retrieves real-time logs, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @param {Function} cb - Callback function to handle real-time logs.
   * @returns {Promise<any>} - Resolves with real-time logs.
   */
  async getRealTimeLogs(cb) {
    return await this.functionWrapper(
      () => this.zklibTcp.getRealTimeLogs(cb),
      () => this.zklibUdp.getRealTimeLogs(cb)
    );
  }

  /**
   * Disconnects from the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<void>} - A promise that resolves when the disconnection is complete.
   */
  async disconnect() {
    return await this.functionWrapper(
      () => this.zklibTcp.disconnect(),
      () => this.zklibUdp.disconnect()
    );
  }

  /**
   * Powers off the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of powering off the device.
   */
  async powerOff() {
    return await this.functionWrapper(() => this.zklibTcp.powerOff());
  }

  /**
   * Puts the device into sleep mode, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of putting the device into sleep mode.
   */
  async sleep() {
    return await this.functionWrapper(() => this.zklibTcp.sleep());
  }

  /**
   * Disables the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of disabling the device.
   */
  async disableDevice() {
    return await this.functionWrapper(() => this.zklibTcp.disableDevice());
  }

  /**
   * Enables the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the result of enabling the device.
   */
  async enableDevice() {
    return await this.functionWrapper(
      () => this.zklibTcp.enableDevice(),
      () => this.zklibUdp.enableDevice()
    );
  }

  /**
   * Restarts the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of restarting the device.
   */
  async restart() {
    return await this.functionWrapper(() => this.zklibTcp.restart());
  }

  /**
   * Frees data on the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the result of freeing data on the device.
   */
  async freeData() {
    return await this.functionWrapper(
      () => this.zklibTcp.freeData(),
      () => this.zklibUdp.freeData()
    );
  }

  /**
   * Retrieves device information, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the device information.
   */
  async getInfo() {
    return await this.functionWrapper(
      () => this.zklibTcp.getInfo(),
      () => this.zklibUdp.getInfo()
    );
  }

  /**
   * Retrieves socket status, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the socket status.
   */
  async getSocketStatus() {
    return await this.functionWrapper(
      () => this.zklibTcp.getSocketStatus(),
      () => this.zklibUdp.getSocketStatus()
    );
  }

  /**
   * Clears attendance logs, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the result of clearing attendance logs.
   */
  async clearAttendanceLog() {
    return await this.functionWrapper(
      () => this.zklibTcp.clearAttendanceLog(),
      () => this.zklibUdp.clearAttendanceLog()
    );
  }

  /**
   * Executes a command on the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @param {number} command - The command to execute.
   * @param {string} [data=""] - Optional data for the command.
   * @returns {Promise<any>} - Resolves with the result of the command execution.
   */
  async executeCmd(command, data = "") {
    return await this.functionWrapper(
      () => this.zklibTcp.executeCmd(command, data),
      () => this.zklibUdp.executeCmd(command, data)
    );
  }

  /**
   * Sets an interval schedule.
   *
   * @param {Function} cb - Callback function to execute.
   * @param {number} timer - Interval timer in milliseconds.
   */

  setIntervalSchedule(cb, timer) {
    this.interval = setInterval(cb, timer);
  }

  /**
   * Sets a timer schedule.
   *
   * @param {Function} cb - Callback function to execute.
   * @param {number} timer - Timer duration in milliseconds.
   */
  setTimerSchedule(cb, timer) {
    this.timer = setTimeout(cb, timer);
  }
}

module.exports = ZKLib;
