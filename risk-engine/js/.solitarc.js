const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "shank",
  programName: "risk_engine",
  programId: "8wx7soBBnx2quQcybXNU7cH2eVs16tDL7aobemfsD7n2",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};