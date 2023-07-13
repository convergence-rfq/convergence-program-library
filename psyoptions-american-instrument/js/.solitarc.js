const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_american_instrument",
  programId: "8jc8D8H1jkzJZvHmR6xXvxKwCCo4L2fg6gxoBYam1em9",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
