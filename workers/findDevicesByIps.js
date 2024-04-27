const { parentPort, workerData, isMainThread } = require("worker_threads");

if (!isMainThread) {
  const devices = JSON.parse(workerData.devices);
  const activeIps = JSON.parse(workerData.activeIps);

  const filtered = devices.filter((device) => activeIps.includes(device.ip));

  parentPort.postMessage(filtered);
}
