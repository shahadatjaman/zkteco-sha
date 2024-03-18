const ZKTeco = require("./zklib");

const test = async () => {
  try {
    // Define the IP address of the device.
    const deviceIp = "192.168.1.201";
    const deviceIps = ["192.168.1.201", "192.168.1.1", "192.168.1.8"];

    // List of devices with their respective IP addresses and ports.
    const devices = [{ deviceIp: "192.168.1.8", devicePort: "4370" }];
    let zkInstance = new ZKTeco(devices);

    // Establish connections to the machine using sockets.
    await zkInstance.createSockets();

    // const hasDevice = await zkInstance.hasDevices();
    const getAllConnectedDevice = await zkInstance.getAllConnectedDevice();

    // const getAllDisconnectedDevice = await zkInstance.getAllDisconnectedDevice(
    //   deviceIps
    // );

    // console.log("getAllDisconnectedDevice", getAllDisconnectedDevice);
    // console.log("getAllConnectedDevice", getAllConnectedDevice);
  } catch (e) {
    console.log(e);
  }
};

test();
