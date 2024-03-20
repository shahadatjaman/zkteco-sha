const ZKLibTCP = require("./zklibtcp");
const ZKLibUDP = require("./zklibtcp");

class ZKLib {
  constructor(devices) {
    this.connectionType = null;

    this.zklibTcp = new ZKLibTCP(devices);
    this.zklibUdp = new ZKLibUDP(devices);
    this.interval = null;
    this.timer = null;
    this.isBusy = false;
  }

  async connectAll() {
    await this.zklibTcp.connectAll();
  }

  async getAllConnectedIps() {
    return await this.zklibTcp.getAllConnectedIps();
  }

  async getAllDisconnectedIps(allDeviceIps) {
    return this.zklibTcp.getAllDisconnectedIps(allDeviceIps);
  }

  async setUser(
    deviceIp,
    uid,
    userid,
    name,
    password = "0",
    role = 0,
    cardno = 0
  ) {
    return await this.zklibTcp.setUser(
      deviceIp,
      uid,
      userid,
      name,
      password,
      role,
      cardno
    );
  }

  async getAttendances(deviceIp) {
    const records = await this.zklibTcp.getAttendances(deviceIp);
    return records;
  }

  async getUsers(deviceIp) {
    const records = await this.zklibTcp.getUsers(deviceIp);
    return records;
  }

  async getAllConnectedDevices() {
    const getAllConnectedDevices = await this.zklibTcp.getAllConnectedDevices();
    return getAllConnectedDevices;
  }
  async getTime(deviceIp) {
    const records = await this.zklibTcp.getTime(deviceIp);
    return records;
  }

  async getInfo(deviceIp) {
    const records = await this.zklibTcp.getInfo(deviceIp);
    return records;
  }
}
module.exports = ZKLib;
