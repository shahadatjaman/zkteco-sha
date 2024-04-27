const ZKTeco = require("./zklib");

const test = async () => {
  console.time();
  try {
    // List of devices with their respective IP addresses and ports.
    const devices = [{ deviceIp: "192.168.1.8", devicePort: "4370" }];
    let zkInstance = new ZKTeco(devices);

    // Establish connections to the machine using sockets.
    await zkInstance.connectAll();

    console.log("zkInstance", zkInstance);
  } catch (e) {
    console.log(`Error at 19`);
  }
};

test();
