const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "AVNAM79VZBogmQLQWWgryaqrWXqooWP9UqUQvo3JRDUx",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
