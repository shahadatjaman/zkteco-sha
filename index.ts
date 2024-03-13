import ZKLibTCP from "./zklibtcp";
import ZKLibUDP from "./zklibudp";
import { ZKError, ERROR_TYPES } from "./zkerror";

export interface Cat {
  getName(name: string): string;
}
/**
 * Creates a new ZKLibClient instance with TCP and UDP connections.
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
  constructor(
    public ip: string,
    public port: number,
    public timeout: number,
    public inport: number
  ) {
    this.connectionType = null;
    this.zklibTcp = new ZKLibTCP(ip, port, timeout);
    this.zklibUdp = new ZKLibUDP(ip, port, timeout, inport);
    this.interval = null;
    this.timer = null;
    this.isBusy = false;
    this.status = "";
  }

  // Properties
  connectionType: any; // You might want to define a type for this.
  zklibTcp: ZKLibTCP;
  zklibUdp: ZKLibUDP;
  interval: any; // You might want to define a type for this.
  timer: any; // You might want to define a type for this.
  isBusy: boolean;
  status: string;

  /**
   * Wraps TCP and UDP callbacks based on the connection type.
   *
   * @param {Function} tcpCallback - TCP callback function.
   * @param {Function} udpCallback - UDP callback function.
   * @param {string} command - Command being executed.
   * @returns {Promise<any>} - Resolves with the result of the callback execution.
   */
  async functionWrapper(
    tcpCallback: () => Promise<any>,
    udpCallback: () => Promise<any>,
    command?: string
  ): Promise<any> {
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
          `[${this.connectionType?.toUpperCase()}] ${command}`,
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
  async createSocket(
    cbErr?: Function | any,
    cbClose?: Function | any
  ): Promise<void> {
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
    }
  }

  async getStatus(): Promise<string> {
    return this.status;
  }

  /**
   * Retrieves user data, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with user data.
   */
  async getUsers(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getUsers(),
      () => this.zklibUdp.getUsers()
    );
  }

  /**
   * Retrieves the device time, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the device time.
   */
  async getTime(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getTime(),
      () => this.zklibUdp.getTime()
    );
  }

  /**
   * Retrieves the serial number of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device serial number.
   */
  async getSerialNumber(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getSerialNumber(),
      () => Promise.reject(new Error("UDP not supported for getSerialNumber")),
      "getSerialNumber"
    );
  }

  /**
   * Retrieves the device version, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device version.
   */
  async getDeviceVersion(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getDeviceVersion(),
      () => Promise.reject(new Error("UDP not supported for getDeviceVersion")),
      "getDeviceVersion"
    );
  }

  /**
   * Retrieves the device name, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device name.
   */
  async getDeviceName(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getDeviceName(),
      () => Promise.reject(new Error("UDP not supported for getDeviceName")),
      "getDeviceName"
    );
  }

  /**
   * Retrieves the platform information of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the platform information.
   */
  async getPlatform(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getPlatform(),
      () => Promise.reject(new Error("UDP not supported for getPlatform")),
      "getPlatform"
    );
  }

  /**
   * Retrieves the operating system information of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the operating system information.
   */
  async getOS(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getOS(),
      () => Promise.reject(new Error("UDP not supported for getOS")),
      "getOS"
    );
  }

  /**
   * Retrieves work code information, using TCP.
   *
   * @returns {Promise<any>} - Resolves with work code information.
   */
  async getWorkCode(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getWorkCode(),
      () => Promise.reject(new Error("UDP not supported for getWorkCode")),
      "getWorkCode"
    );
  }

  /**
   * Retrieves PIN information, using TCP.
   *
   * @returns {Promise<any>} - Resolves with PIN information.
   */
  async getPIN(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getPIN(),
      () => Promise.reject(new Error("UDP not supported for getPIN")),
      "getPIN"
    );
  }

  /**
   * Retrieves face recognition status, using TCP.
   *
   * @returns {Promise<string>} - Resolves with "Yes" if face recognition is enabled, otherwise "No".
   */
  async getFaceOn(): Promise<string> {
    return this.functionWrapper(
      () => this.zklibTcp.getFaceOn(),
      () => Promise.reject(new Error("UDP not supported for getFaceOn")),
      "getFaceOn"
    );
  }

  /**
   * Retrieves SSR information, using TCP.
   *
   * @returns {Promise<any>} - Resolves with SSR information.
   */
  async getSSR(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getSSR(),
      () => Promise.reject(new Error("UDP not supported for getSSR")),
      "getSSR"
    );
  }

  /**
   * Retrieves the firmware version of the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the firmware version.
   */
  async getFirmware(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getFirmware(),
      () => Promise.reject(new Error("UDP not supported for getFirmware")),
      "getFirmware"
    );
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
  async setUser(
    uid: number,
    userid: string,
    name: string,
    password: string,
    role: number = 0,
    cardno: string = ""
  ): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.setUser(uid, userid, name, password, role, cardno),
      () => this.zklibTcp.setUser(uid, userid, name, password, role, cardno)
    );
  }

  /**
   * Retrieves the size of attendance logs, using TCP.
   *
   * @returns {Promise<number>} - Resolves with the size of attendance logs.
   */
  async getAttendanceSize(): Promise<number> {
    return this.functionWrapper(
      () => this.zklibTcp.getAttendanceSize(),
      () => Promise.reject(new Error("UDP not supported for getAttendanceSize"))
    );
  }

  /**
   * Retrieves attendance data, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @param {Function} cb - Callback function to handle attendance data.
   * @returns {Promise<any>} - Resolves with attendance data.
   */
  async getAttendances(cb: Function): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getAttendances(cb),
      () => this.zklibUdp.getAttendances(cb)
    );
  }

  /**
   * Disconnects from the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<void>} - A promise that resolves when the disconnection is complete.
   */
  async disconnect(): Promise<void> {
    return this.functionWrapper(
      () => this.zklibTcp.disconnect(),
      () => this.zklibUdp.disconnect()
    );
  }

  /**
   * Powers off the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of powering off the device.
   */
  async powerOff(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.powerOff(),
      () => Promise.reject(new Error("UDP not supported for powerOff"))
    );
  }

  /**
   * Puts the device into sleep mode, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of putting the device into sleep mode.
   */
  async sleep(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.sleep(),
      () => Promise.reject(new Error("UDP not supported for sleep"))
    );
  }

  /**
   * Disables the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of disabling the device.
   */
  async disableDevice(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.disableDevice(),
      () => Promise.reject(new Error("UDP not supported for disableDevice"))
    );
  }

  /**
   * Enables the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the result of enabling the device.
   */
  async enableDevice(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.enableDevice(),
      () => this.zklibUdp.enableDevice()
    );
  }

  /**
   * Restarts the device, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the result of restarting the device.
   */
  async restart(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.restart(),
      () => Promise.reject(new Error("UDP not supported for restart"))
    );
  }

  /**
   * Frees data on the device, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the result of freeing data on the device.
   */
  async freeData(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.freeData(),
      () => this.zklibUdp.freeData()
    );
  }

  /**
   * Retrieves device information, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the device information.
   */
  async getInfo(): Promise<any> {
    return this.functionWrapper(
      () => this.zklibTcp.getInfo(),
      () => this.zklibUdp.getInfo()
    );
  }

  /**
   * Clears attendance logs, prioritizing TCP and falling back to UDP if TCP fails.
   *
   * @returns {Promise<any>} - Resolves with the result of clearing attendance logs.
   */
  async clearAttendanceLog(): Promise<any> {
    return this.functionWrapper(
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
  async executeCmd(command: number, data: string = ""): Promise<any> {
    return this.functionWrapper(
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
  setIntervalSchedule(cb: Function, timer: number): void {
    this.interval = setInterval(cb, timer);
  }

  /**
   * Sets a timer schedule.
   *
   * @param {Function} cb - Callback function to execute.
   * @param {number} timer - Timer duration in milliseconds.
   */
  setTimerSchedule(cb: Function, timer: number): void {
    this.timer = setTimeout(cb, timer);
  }
}

export default ZKLib;
