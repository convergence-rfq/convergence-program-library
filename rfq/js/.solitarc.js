const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "54DfGVnmAgRskJE5wu9n6o3y97sY9Djow2FvaGuSMxNf",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
