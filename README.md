## Documentation

This package enables real-time tracking of employee attendance using ZKTeco devices. It seamlessly integrates with multiple devices and utilizes their IP addresses for efficient monitoring and management.

```javascript
// Test code:

const ZKTeco = require("zkteco-sha");

const test = async () => {
  try {
    // Define the IP address of the device.
    const deviceIp = "192.168.1.201";

    // List of devices with their respective IP addresses and ports.
    const devices = [{ deviceIp: "192.168.1.201", devicePort: "4370" }];
    let zkInstance = new ZKTeco(devices);

    // Establish connections to the machine using sockets.
    await zkInstance.createSockets();

    // Retrieve users based on device IP addresses in the machine.
    const users = await zkInstance.getUsers(deviceIp);
    console.log(users);

    // Retrieve all devices currently connected.
    const getAllConnectedDevices = await zkInstance.getAllConnectedDevice();

    // Create a new user: setUser(deviceIp,uid, userid, name, password, role = 0, cardno = 0)
    await zkInstance.setUser(deviceIp, 12, "9", "Shahadat Jaman", "1", 0, 0);

    // Retrieve all logs stored in the machine.
    // At the moment, there's no filter to select specific device logs, it captures everything!!
    const logs = await zkInstance.getAttendances(function () {
      if (err) throw err;
    }, deviceIp);
    console.log(logs);

    // Retrieve the current time from the machine.
    const z = await zkInstance.getTime(deviceIp);
    console.log(z.toString());

    // Serial number
    const sr = await zkInstance.getSerialNumber(deviceIp);
    console.log(sr);

    // Firmware Version
    const fw = await zkInstance.getFirmware(deviceIp);
    console.log(fw);

    // PIN of the device
    const pi = await zkInstance.getPIN(deviceIp);
    console.log(pi);

    // Device Version
    const dv = await zkInstance.getDeviceVersion(deviceIp);
    console.log(dv);

    // Device Name
    const n = await zkInstance.getDeviceName(deviceIp);
    console.log(n);

    // Platform Version
    const p = await zkInstance.getPlatform(deviceIp);
    console.log(p);

    // OS Version
    const o = await zkInstance.getOS(deviceIp);
    console.log(o);

    // Get Attendance size
    const s = await zkInstance.getAttendanceSize(deviceIp);
    console.log(s);

    // Clear out the machine's data.
    // Reminder: It's important to do this when there's too much data in the machine,
    // as having too much can make the machine slower.
    zkInstance.clearAttendanceLog(deviceIp);

    // Unplug the machine by device ip (but not when you need instant updates.
    await zkInstance.disconnect(deviceIp);
  } catch (e) {
    console.log(e);
    if (e.code === "EADDRINUSE") {
    }
  }
};

test(); // in the end we execute the function
```

There are many functions you can just visit [zk protocol](https://github.com/adrobinoga/zk-protocol/blob/master/protocol.md) to see the command and put it in executeCmd function already existed in the library.
The function executeCmd accepts the command constant in `constants.js` and the data if needed, and we can implement it as follows:

```javascript
    async executeCmd(command, data=''){
        return await this.functionWrapper(
            ()=> this.zklibTcp.executeCmd(command, data),
            ()=> this.zklibUdp.executeCmd(command , data)
        )
    }

    // unlock the door
    executeCmd(CMD.CMD_UNLOCK, '')

```
