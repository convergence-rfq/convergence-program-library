const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "hxro_print_trade_provider",
  programId: "598ZWckNjupx5sftmNC27NPRYHbwNbxi2dYBUan7Su1P",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
