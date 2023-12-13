const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "risk_engine",
  programId: "F3o2hWqv61TavHuZYuStvW2Zd3M1JnoqBmmgGU77LRTr",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
