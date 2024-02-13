const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "spot_instrument",
  programId: "4A9M7iojGDPc4n4YDGnTmsYsNKUohG1zM1nrAqVMMmrm",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
