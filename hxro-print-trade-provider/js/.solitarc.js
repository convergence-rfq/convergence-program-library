const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "hxro_print_trade_provider",
  programId: "fZ8jq8MYbf2a2Eu3rYFcFKmnxqvo8X9g5E8otAx48ZE",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
