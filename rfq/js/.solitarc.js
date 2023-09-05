const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "CdvjLpJGpYTdpdanPpfUe1zPERYvpvP4VALUz62eRrGP",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
