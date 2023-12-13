const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "hxro_print_trade_provider",
  programId: "4WbVwc5Edfo3oB1n16bVC9qrghYHSNh1qAECbSCyiT95",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
