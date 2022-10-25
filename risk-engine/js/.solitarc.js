const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "risk_engine",
  programId: "9sEUmfZPhH8qVEoFmfdbJhKcfWP5LCCZfb2Cu7zffs4b",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};