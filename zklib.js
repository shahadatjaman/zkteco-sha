const ZKLibTCP = require("./zklibtcp");
const ZKLibUDP = require("./zklibudp");
const { ERROR_TYPES, ZKError } = require("./zkerror");
const { findDeviceByIp } = require("./utils");

class ZKLib {
  constructor(devices) {
    this.devices = devices;
    this.timeout = 10000;
    this.inport = 4000;

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
        const { zklibTcp, ip, port } = connection;

        if (!zklibTcp.socket) {
          await zklibTcp.createSocket(cbErr, cbClose);
          await zklibTcp.connect();
          console.log(`Connected to ${ip}:${port} via TCP`);
          connection.connectionType = "tcp";
          connection.status = 1;
        }
      }
    } catch (errToConnect) {
      // console.log("errToConnect", errToConnect);
      for (const connection of this.connections) {
        connection.status = 0;
        try {
          await connection.zklibTcp.disconnect();
        } catch (errToDisconnect) {
          console.log("Error disconnecting TCP:", errToDisconnect);
        }

        if (errToConnect.code !== ERROR_TYPES.ECONNREFUSED) {
          continue; // Skip UDP connection if TCP connection failed for this device
        }

        try {
          if (!connection.zklibUdp.socket) {
            await connection.zklibUdp.createSocket(cbErr, cbClose);
            await connection.zklibUdp.connect();
            connection.connectionType = "udp";
            connection.status = 1;
          }
        } catch (err) {
          if (err.code !== "EADDRINUSE") {
            connection.connectionType = null;
            try {
              await connection.zklibUdp.disconnect();
              connection.zklibUdp.socket = null;
              connection.zklibTcp.socket = null;
            } catch (err) {}
          } else {
            connection.connectionType = "udp";
            connection.status = 0;
          }
        }
      }
    }
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
    if (this.connections && this.connections.length > 0) {
      const retrives = async () => {
        let sn = [];

        for (const connection of this.connections) {
          const { zklibTcp, connectionType, ip, port } = connection;

          const { userCounts, logCounts, logCapacity } = await this.getInfo(ip);

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

      return retrives();
    } else {
      console.log("has not device");
      return null;
    }
  }

  async setUser(uid, userid, name, password, role = 0, cardno = 0, deviceIP) {
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
  }

  async getInfo(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getInfo(),
      () => device.zklibUdp.getInfo(),
      device
    );
  }

  async getPIN(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(() => device.zklibTcp.getPIN(), device);
  }

  async getSerialNumber(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getSerialNumber(),
      device.zklibTcp.getSerialNumber(),
      device
    );
  }

  async getDeviceVersion(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getDeviceVersion(),
      device.zklibTcp.getDeviceVersion(),
      device
    );
  }

  async getDeviceName(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getDeviceName(),
      device.zklibTcp.getDeviceName(),
      device
    );
  }

  async getPlatform(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getPlatform(),
      device.zklibTcp.getPlatform(),
      device
    );
  }

  async getOS(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getOS(),
      device.zklibTcp.getOS(),
      device
    );
  }

  async getPIN(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getPIN(),
      device.zklibTcp.getPIN(),
      device
    );
  }

  async getAttendanceSize(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getAttendanceSize(),
      device.zklibTcp.getAttendanceSize(),
      device
    );
  }

  async getAttendances(cb, deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);
    return await this.functionWrapper(
      () => device.zklibTcp.getAttendances(cb),
      () => device.zklibUdp.getAttendances(cb),
      device
    );
  }

  async clearAttendanceLog(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);
    return await this.functionWrapper(
      () => device.zklibTcp.clearAttendanceLog(),
      () => device.zklibUdp.clearAttendanceLog(),
      device
    );
  }

  async getTime(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.getTime(),
      device.zklibTcp.getTime(),
      device
    );
  }

  async powerOff(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.powerOff(),
      device.zklibTcp.powerOff(),
      device
    );
  }

  async restart(deviceIP) {
    const device = await findDeviceByIp(this.connections, deviceIP);

    return await this.functionWrapper(
      () => device.zklibTcp.restart(),
      device.zklibTcp.restart(),
      device
    );
  }
}
module.exports = ZKLib;
