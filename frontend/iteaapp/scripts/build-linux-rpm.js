#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const { build, Platform } = require("electron-builder");
const {
  NodeModulesCollector,
} = require("app-builder-lib/out/node-module-collector/nodeModulesCollector");

NodeModulesCollector.prototype.getDependenciesTree = async function (pm) {
  const command = pm === "npm" ? "npm" : pm;
  const args = this.getArgs();
  const result = childProcess.spawnSync(command, args, {
    cwd: this.rootDir,
    env: { COREPACK_ENABLE_STRICT: "0", ...process.env },
    shell: false,
    encoding: "utf8",
  });

  const execName = path.basename(command, path.extname(command)).toLowerCase();
  const shouldIgnore = result.status === 1 && execName === "npm" && args.includes("list");
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !shouldIgnore) {
    throw new Error(`Node module collector process exited with code ${result.status}:\n${result.stderr || ""}`);
  }

  const stdout = result.stdout || "";
  return this.parseDependenciesTree(stdout);
};

build({
  targets: Platform.LINUX.createTarget(["rpm"]),
  publish: "never",
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
