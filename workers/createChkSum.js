const { parentPort, isMainThread, workerData } = require("worker_threads");

if (!isMainThread) {
  let buf = workerData.buf;
  console.log("buf", buf);
  let chksum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i == buf.length - 1) {
      chksum += buf[i];
    } else {
      chksum += buf.readUInt16LE(i);
    }
    chksum %= USHRT_MAX;
  }
  chksum = USHRT_MAX - chksum - 1;
  parentPort.postMessage(chksum);
}
