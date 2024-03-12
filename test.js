const ZKLib = require("./zklib");
const test = async () => {
  let zkInstance = new ZKLib("192.168.1.8", 4370, 10000, 4000);
  try {
    // Create socket to machine
    await zkInstance.createSocket();
  } catch (e) {
    console.log("e", e);
  }
};

test();
