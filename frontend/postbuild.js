/*
This script moves the files from the browser directory to the root of the dist directory.
This is done to make the files accessible from the root of the server and avoids unnecessary nesting when running inside docker
*/

const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "dist", "browser");
const targetDir = path.join(__dirname, "dist");

// Move files
fs.readdirSync(sourceDir).forEach((file) => {
  const srcPath = path.join(sourceDir, file);
  const destPath = path.join(targetDir, file);
  fs.renameSync(srcPath, destPath);
});

// Remove the browser directory and license file
fs.rmdirSync(sourceDir, { recursive: true });
fs.unlinkSync(path.join(targetDir, "3rdpartylicenses.txt"));
