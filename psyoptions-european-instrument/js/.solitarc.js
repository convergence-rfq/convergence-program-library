const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_european_instrument",
  programId: "2ZEFFaZgtZAkfDJqBev3yXNW1xHBsFgVW6WYaQFdEwbr",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
