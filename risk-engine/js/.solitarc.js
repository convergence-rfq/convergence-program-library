const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "risk_engine",
  programId: "GL6ezn1mYExqgbFQs85NjfBUi1k4uYkdjGf2pvSKktz8",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
