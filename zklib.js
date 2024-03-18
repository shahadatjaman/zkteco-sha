const ZKLibTCP = require("./zklibtcp");
const ZKLibUDP = require("./zklibudp");

const { findDeviceByIp } = require("./utils");

class ZKLib {
  constructor(devices) {
    this.devices = devices;
    this.timeout = 10000;
    this.inport = 4000;
    this.hasDevice = false;
    this.connectedDevices = [];
    this.connectedIps = [];

    this.connections = this.devices.map((device, key) => {
      const { deviceIp, devicePort } = device;

      return {
        index: key,
        ip: deviceIp,
        port: devicePort,
        timeout: this.timeout,
        inport: this.inport,
        zklibTcp: new ZKLibTCP(deviceIp, devicePort, this.timeout),
        zklibUdp: new ZKLibUDP(deviceIp, devicePort, this.timeout, this.inport),
        interval: null,
        timer: null,
        isBusy: false,
        status: 0,
        connectionType: "",
      };
    });
  }

  async createSockets(cbErr, cbClose) {
    try {
      for (const connection of this.connections) {
        const { zklibTcp, ip } = connection;

        if (!zklibTcp.socket) {
          await zklibTcp.createSocket(cbErr, cbClose);
          await zklibTcp.connect();

          connection.connectionType = "tcp";
          connection.status = 1;
          this.connectedIps.push(ip);
        }
      }

      this.hasDevice = this.connectedIps.length !== 0;
    } catch (errToConnect) {}
  }

  async hasDevices() {
    return this.hasDevice;
  }
  /**
   * Wraps TCP and UDP callbacks based on the connection type.
   *
   * @param {Function} tcpCallback - TCP callback function.
   * @param {Function} udpCallback - UDP callback function.
   * @param {string} command - Command being executed.
   * @returns {Promise<any>} - Resolves with the result of the callback execution.
   */
  async functionWrapper(tcpCallback, udpCallback, device) {
    switch (device.connectionType) {
      case "tcp":
        if (device.zklibTcp.socket) {
          try {
            const res = await tcpCallback();

            return res;
          } catch (err) {
            console.log("error_no 100", err);
          }
        }
      case "udp":
        if (device.zklibUdp.socket) {
          try {
            const res = await udpCallback();
            return res;
          } catch (err) {
            console.log("error_no 101", err);
          }
        } else {
        }
      default:
        return "";
    }
  }

  /**
   * Retrieves the device SN, using TCP.
   *
   * @returns {Promise<any>} - Resolves with the device SN.
   */
  async getAllConnectedDevice() {
    if (this.hasDevice) {
      if (this.connections && this.connections.length > 0) {
        const retrives = async () => {
          let sn = [];

          for (const connection of this.connections) {
            const { zklibTcp, connectionType, ip, port } = connection;

            const { userCounts, logCounts, logCapacity } = await this.getInfo(
              ip
            );

            let device_sn = await zklibTcp.getSerialNumber(ip);

            let getDeviceVersion = await zklibTcp.getDeviceVersion(ip);

            let getDeviceName = await zklibTcp.getDeviceName(ip);

            const getPlatform = await zklibTcp.getPlatform(ip);

            const getOS = await zklibTcp.getOS(ip);

            const getPIN = await zklibTcp.getPIN(ip);

            const getTime = await zklibTcp.getTime(ip);

            sn.push({
              ip,
              port,
              sn: device_sn,
              userCounts,
              connectionType,
              logCounts,
              logCapacity,
              deviceVersion: getDeviceVersion,
              deviceName: getDeviceName,
              platform: getPlatform,
              os: getOS,
              pin: getPIN,
              deviceTime: getTime,
            });
          }

          return sn;
        };

        this.connectedDevices = retrives();
        return retrives();
      } else {
        console.log("has not device");
        return null;
      }
    } else {
      return null;
    }
  }

  async getActiveIps() {
    if (this.connectedIps && this.connectedIps.length > 0) {
      return this.connectedIps;
    } else {
      return null;
    }
  }
  async getAllDisconnectedDevice(ips) {
    if (this.connectedIps && this.connectedIps.length > 0) {
      const deviceIPs = new Set(this.connectedIps.map((ip) => ip));
      return ips.filter((ip) => !deviceIPs.has(ip));
    } else {
      return null;
    }
  }

  async setUser(deviceIP, uid, userid, name, password, role = 0, cardno = 0) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);
      return await this.functionWrapper(
        () =>
          device.zklibTcp.setUser(
            uid,
            userid,
            name,
            password,
            role,
            cardno,
            deviceIP
          ),
        device.zklibTcp.setUser(
          uid,
          userid,
          name,
          password,
          role,
          cardno,
          deviceIP
        ),
        deviceIP
      );
    } else {
      return null;
    }
  }

  async getInfo(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);
      return await this.functionWrapper(
        () => device.zklibTcp.getInfo(),
        () => device.zklibUdp.getInfo(),
        device
      );
    } else {
      return null;
    }
  }

  async getPIN(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(() => device.zklibTcp.getPIN(), device);
    } else {
      return null;
    }
  }

  async getSerialNumber(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getSerialNumber(),
        device.zklibTcp.getSerialNumber(),
        device
      );
    } else {
      return null;
    }
  }

  async getDeviceVersion(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getDeviceVersion(),
        device.zklibTcp.getDeviceVersion(),
        device
      );
    } else {
      return null;
    }
  }

  async getDeviceName(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getDeviceName(),
        device.zklibTcp.getDeviceName(),
        device
      );
    } else {
      return null;
    }
  }

  async getPlatform(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getPlatform(),
        device.zklibTcp.getPlatform(),
        device
      );
    } else {
      return null;
    }
  }

  async getOS(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getOS(),
        device.zklibTcp.getOS(),
        device
      );
    } else {
      return null;
    }
  }

  async getPIN(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getPIN(),
        device.zklibTcp.getPIN(),
        device
      );
    } else {
      return null;
    }
  }

  async getAttendanceSize(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getAttendanceSize(),
        device.zklibTcp.getAttendanceSize(),
        device
      );
    } else {
      return null;
    }
  }

  async getAttendances(cb, deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);
      return await this.functionWrapper(
        () => device.zklibTcp.getAttendances(cb),
        () => device.zklibUdp.getAttendances(cb),
        device
      );
    } else {
      return null;
    }
  }

  async clearAttendanceLog(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);
      return await this.functionWrapper(
        () => device.zklibTcp.clearAttendanceLog(),
        () => device.zklibUdp.clearAttendanceLog(),
        device
      );
    } else {
      return null;
    }
  }

  async getTime(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getTime(),
        device.zklibTcp.getTime(),
        device
      );
    } else {
      return null;
    }
  }

  async getFirmware(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.getFirmware(),
        device.zklibTcp.getFirmware(),
        device
      );
    } else {
      return null;
    }
  }

  async powerOff(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.powerOff(),
        device.zklibTcp.powerOff(),
        device
      );
    } else {
      return null;
    }
  }

  async restart(deviceIP) {
    if (this.hasDevice) {
      const device = await findDeviceByIp(this.connections, deviceIP);

      return await this.functionWrapper(
        () => device.zklibTcp.restart(),
        device.zklibTcp.restart(),
        device
      );
    } else {
      return null;
    }
  }
}
module.exports = ZKLib;
