const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "3t9BM7DwaibpjNVWAWYauZyhjteoTjuJqGEqxCv7x9MA",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};