const ZKTeco = require("./zklib");

const test = async () => {
  console.time();
  try {
    // List of devices with their respective IP addresses and ports.
    const devices = [{ deviceIp: "192.168.1.8", devicePort: "4370" }];
    let zkInstance = new ZKTeco(devices);

    // Establish connections to the machine using sockets.

    await zkInstance.connectAll();
    await zkInstance.shutdown("192.168.1.8");
  } catch (e) {
    console.log(e);
    console.timeEnd("from catch in test.js");
  }
};

test();
