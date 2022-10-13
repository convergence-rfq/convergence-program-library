const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "2NivPZeNtQ7B7vDBXNMCi9x3C9SWDvqCfiZNcDckB6hp",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};