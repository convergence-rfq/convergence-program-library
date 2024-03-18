const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "vault_operator",
  programId: "DftT8Q74YPqwrtJzy6g97XLzouG2YWaWZfRad6yK2GvA",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
