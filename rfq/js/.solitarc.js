const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "BThK6bNFeBkMHphJ5bcUKi1tXWPyFqbFN4FKB7WoiJEU",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
