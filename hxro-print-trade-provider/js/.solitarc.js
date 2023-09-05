const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "hxro_print_trade_provider",
  programId: "GyRW7qvzx6UTVW9DkQGMy5f1rp9XK2x53FvWSjUUF7BJ",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
