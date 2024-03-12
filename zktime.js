const timeParser = require('./timestamp_parser');
const { COMMANDS } = require('./constants');

module.exports = class {
  /**
   *
   * @param {(error: Error, dateTime:Date) => void} [cb]
   */
  getTime(cb) {
    this.executeCmd(COMMANDS.CMD_GET_TIME, '', (err, ret) => {
      if (err) return cb(err);

      return cb(null, timeParser.decode(ret.readUInt32LE(8)));
    });
  }
};
