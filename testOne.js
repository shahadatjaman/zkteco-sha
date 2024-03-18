function getNonMatchingIPs(devices, ips) {
  const deviceIPs = new Set(devices.map((device) => device.ip));
  return ips.filter((ip) => !deviceIPs.has(ip));
}

const devices = [
  {
    ip: "192.168.1.8",
    port: "4370",
    sn: "A8N5231660428\x00",
    userCounts: 4,
    connectionType: "tcp",
    logCounts: 5,
    logCapacity: 100000,
    deviceVersion: "10\x00",
    deviceName: "K40/ID\x00",
    platform: "ZLM60_TFT\x00",
    os: "1\x00",
    pin: "14\x00",
    deviceTime: new Date("2024-03-18T08:14:01.000Z"),
  },
];

const ips = ["192.168.1.8", "192.168.1.1"];

const nonMatchingIPs = getNonMatchingIPs(devices, ips);
console.log(nonMatchingIPs); // Output: ["192.168.1.1"]
