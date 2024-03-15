# Zkteco-sha

- install

```
npm i zkteco-sha
```

- Documentation

```javascript
//  test code:

const ZKTeco = require("zkteco-sha");
const test = async () => {
  const devices = [];

  try {
    const devices = [
      {
        deviceIp: "192.168.1.8",
        devicePort: "4370",
      },
    ];
    let zkInstance = new ZKLib(devices);
    // Create sockets to machine
    await zkInstance.createSockets();

    // Get users in machine

    const users = await zkInstance.getUsers();
    console.log(users);

    // Get all connected devices
    const getAllConnectedDevices = await zkInstance.getAllConnectedDevice();

    // Create new user: setUser(uid, userid, name, password, role = 0, cardno = 0)
    await zkInstance.setUser(12, "9", "Shahadat Jaman", "1", 0, 0);

    // Get all logs in the machine
    // Currently, there is no filter to take data, it just takes all !!
    const logs = await zkInstance.getAttendances(function () {
      if (err) throw err;
      console.log("Very cool! 😎");
    });
    console.log(logs);

    // You can also read realtime log by getRealTimelogs function

    await zkInstance.getRealTimeLogs((data) => {
      // do something when some checkin
      console.log(data);
    });

    // Get the current Time in the machine

    const z = await zkInstance.getTime();
    console.log(z.toString());

    // Serial number

    const sr = await zkInstance.getSerialNumber();
    console.log(sr);

    // Firmware Version

    const fw = await zkInstance.getFirmware();
    console.log(fw);

    // PIN of the device

    const pi = await zkInstance.getPIN();
    console.log(pi);

    // Check Face functionality (Yes if ON, No if OFF)

    const fo = await zkInstance.getFaceOn();
    console.log(fo);

    // SSR (Self-Service-Recorder)

    const ssr = await zkInstance.getSSR();
    console.log(ssr);

    // Device Version

    const dv = await zkInstance.getDeviceVersion();
    console.log(dv);

    // Device Name

    const n = await zkInstance.getDeviceName();
    console.log(n);

    // Platform Version

    const p = await zkInstance.getPlatform();
    console.log(p);

    // OS Version

    const o = await zkInstance.getOS();
    console.log(o);

    // WorkCode of the machine

    const wc = await zkInstance.getWorkCode();
    console.log(wc);

    // Get Attendance size

    const s = await zkInstance.getAttendanceSize();
    console.log(s);

    // Delete the data in machine
    // Note: You should do this when there are too many data in the machine,
    // this issue can slow down machine.

    zkInstance.clearAttendanceLog();

    // Disconnect the machine ( don't do this when you need realtime update :)))
    await zkInstance.disconnect();
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
