#!/usr/bin/env node
// Set CHROME_BIN environment variable from puppeteer before running tests
try {
  const puppeteer = require('puppeteer');
  process.env.CHROME_BIN = puppeteer.executablePath();
} catch (e) {
  // Puppeteer not available, will fall back to system Chrome
}
// Execute the command passed as arguments
const { spawn } = require('child_process');
const command = process.argv.slice(2);
const proc = spawn(command[0], command.slice(1), { stdio: 'inherit', shell: true });
proc.on('exit', (code) => process.exit(code || 0));
