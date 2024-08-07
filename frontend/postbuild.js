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
