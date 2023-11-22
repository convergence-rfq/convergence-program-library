const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "J7WkE9mTzwTo3pjxENdrH7sekZPrN2VYNpk1pgfZxVr9",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
