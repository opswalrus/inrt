import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { File } from "@opswalrus/percolate/file";
import { NodeRuntime } from "./src/node-runtime.ts";

// Returns the currently configured tmp dir from os.tmpdir().
function osTmpDir() {
  return path.resolve(os.tmpdir());
}

function osHomeDir() {
  return path.resolve(os.homedir());
}

function createInrtDir(): string {
  const path = File.join(osHomeDir(), ".inrt");
  fs.mkdirSync(path, { recursive: true });
  return path;
}

function createNamedTmpDir(subDirName: string): string {
  const path = File.join(osTmpDir(), subDirName);
  fs.mkdirSync(path, { recursive: true });
  return path;
}

// const dir = createNamedTmpDir(process.argv[2] || "nodejs");
// console.log("process.argv", process.argv)
// console.log("building in", tmpDir);

const dir = createInrtDir();

const nodeRuntime = new NodeRuntime(dir);

// nodeRuntime.listPackages();
await nodeRuntime.installIfNeeded();
