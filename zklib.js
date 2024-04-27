const ZKLibTCP = require("./zklibtcp");
const ZKLibUDP = require("./zklibudp");

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

  // async getRealTimeLogs(deviceIp, cb) {
  //   const records = await this.zklibTcp.getRealTimeLogs(deviceIp, cb);
  //   return records;
  // }

  async getUsers(deviceIp) {
    const records = await this.zklibTcp.getUsers(deviceIp);
    return records;
  }

  async clearUsers(deviceIp) {
    const res = await this.zklibTcp.clearUsers(deviceIp);
    return res;
  }

  async getAllConnectedDevices() {
    const getAllConnectedDevices = await this.zklibTcp.getAllConnectedDevices();
    return getAllConnectedDevices;
  }

  async getAttendanceSize(deviceIp) {
    const sizeOfAtt = await this.zklibTcp.getAttendanceSize(deviceIp);
    return sizeOfAtt;
  }

  async clearAttendanceLog(deviceIp) {
    const res = await this.zklibTcp.clearAttendanceLog(deviceIp);
    return res;
  }
  async getTime(deviceIp) {
    const records = await this.zklibTcp.getTime(deviceIp);
    return records;
  }

  async getInfo(deviceIp) {
    const records = await this.zklibTcp.getInfo(deviceIp);
    return records;
  }

  async getPIN(deviceIp) {
    return await this.zklibTcp.getPIN(deviceIp);
  }

  async shutdown(deviceIp) {
    await this.zklibTcp.shutdown(deviceIp);
  }

  async restart(deviceIp) {
    await this.zklibTcp.restart(deviceIp);
  }

  async sleep(deviceIp) {
    await this.zklibTcp.sleep(deviceIp);
  }
}
module.exports = ZKLib;
