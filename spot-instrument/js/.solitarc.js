const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "spot_instrument",
  programId: "HNHBtGzS58xJarSbz5XbEjTTEFbAQUHdP8TjQmwjx1gW",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
