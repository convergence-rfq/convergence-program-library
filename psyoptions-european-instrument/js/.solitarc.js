const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_european_instrument",
  programId: "6B7TdBNAF7tWWz5sZbbBZj8jH1ix7QWAchtkvMHveEuW",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
