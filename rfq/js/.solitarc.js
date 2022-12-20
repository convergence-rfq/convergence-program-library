const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "6k3nypehfxd4tqCGRxNEZBMiT4xUPdQCkothLVz3JK6D",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};