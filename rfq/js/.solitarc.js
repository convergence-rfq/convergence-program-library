const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "5Mqd2rYZ1YcmZ711H78mTHaevwSCwAf6Qh4Bc8DjZanH",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
