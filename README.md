## Documentation

This package enables real-time tracking of employee attendance using ZKTeco devices. It seamlessly integrates with multiple devices and utilizes their IP addresses for efficient monitoring and management.

```javascript
// Test code:

const ZKTeco = require("zkteco-sha");

const test = async () => {
  try {
    // Define the IP address of the device.
    const deviceIp = "192.168.1.201";

    //  Ips
    const ips = ["192.168.1.201"];
    let zkInstance = new ZKTeco(devices);

    // List of devices with their respective IP addresses and ports.
    const devices = [{ deviceIp: "192.168.1.201", devicePort: "4370" }];
    let zkInstance = new ZKTeco(devices);

    // Connect all devices
    await zkInstance.connectAll();

    // Retrieve users based on device IP addresses in the machine.
    const users = await zkInstance.getUsers(deviceIp);

    // Retrieve all devices currently connected.
    const getAllConnectedIps = await zkInstance.getAllConnectedIps();

    // Retrieve all disconnected devices by all devices ip.
    const getAllDisconnectedIps = await zkInstance.getAllDisconnectedIps(ips);

    // Create a new user: setUser(deviceIp,uid, userid, name, password, role = 0, cardno = 0)
    await zkInstance.setUser(deviceIp, 12, "9", "Shahadat Jaman", "1", 0, 0);

    // Retrieve all logs stored in the machine.
    // At the moment, there's no filter to select specific device logs, it captures everything!!
    const logs = await zkInstance.getAttendances(deviceIp);
    console.log(logs);

    // Retrieve the current time from the machine.
    const getTime = await zkInstance.getTime(deviceIp);
    console.log(getTime);
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
    async executeCmd(device,command, data=''){
        return await this.functionWrapper(
            ()=> this.zklibTcp.executeCmd(device,command, data),
            ()=> this.zklibUdp.executeCmd(device,command , data)
        )
    }

    // unlock the door
    executeCmd(device,CMD.CMD_UNLOCK, '')

```
