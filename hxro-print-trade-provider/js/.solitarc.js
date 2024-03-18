const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "hxro_print_trade_provider",
  programId: "6zyXbd44vYHhpC1gxZr2BhM6m7jThqsBphn2GD36bUi3",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
