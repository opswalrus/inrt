import os from "node:os";
import axios, { type AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { File } from "@opswalrus/percolate/file";
import { A } from "@opswalrus/percolate/array";
import { V } from "@opswalrus/percolate/type";
import { match } from "ts-pattern";
import which from "which";
import { downloadFile } from "./http.ts";
import { ShellCommand } from "./shell-command.ts";
import { unarchive } from "./unarchive.ts";
import type { CommandResult } from "./command.ts";
import { Memoize } from "fast-typescript-memoize";

export class NodeRuntime {
  static Name = "nodejs";

  private client: AxiosInstance;
  private alreadyInstalled: boolean;
  private localNode: string;
  private localNpm: string;

  constructor(public tmpDir: string) {
    this.client = axios.create({
      baseURL: "https://nodejs.org/",
    });
    this.alreadyInstalled = false;
    this.localNode = File.join(this.tmpDir, NodeRuntime.Name, "bin", "node");
    this.localNpm = File.join(this.tmpDir, NodeRuntime.Name, "bin", "npm");
  }

  async isNodeInstalledGlobally() {
    const result = await ShellCommand.fromString(`node --version`).run();
    // console.log(`isNodeInstalledGlobally result: ${V.inspect(result.toJSON())}`);
    return result.success;
  }

  async isNodeInstalledLocally() {
    const result = await ShellCommand.fromString(`${this.localNode} --version`).run();
    // console.log(`isNodeInstalledLocally result: ${V.inspect(result.toJSON())}`);
    return result.success;
  }

  async isNpmInstalledGlobally() {
    const result = await ShellCommand.fromString(`npm --version`).run();
    // console.log(`isNpmInstalledGlobally result: ${V.inspect(result.toJSON())}`);
    return result.success;
  }

  async isNpmInstalledLocally() {
    const result = await ShellCommand.fromString(`${this.localNpm} --version`).run();
    // console.log(`isNpmInstalledLocally result: ${V.inspect(result.toJSON())}`);
    // console.log(result.err);
    return result.success;
  }

  @Memoize()
  async nodeCmd() {
    if (await this.isNodeInstalledGlobally()) return "node";

    if (await this.isNodeInstalledLocally()) return this.localNode;

    throw new Error("node not installed");
  }

  async nodePath(): Promise<string | null> {
    if (await this.isNodeInstalledGlobally()) {
      return await which("node", { nothrow: true });
    }

    if (await this.isNodeInstalledLocally()) return this.localNode;

    return null;
  }

  @Memoize()
  async npmCmd() {
    if (await this.isNpmInstalledGlobally()) return "npm";

    if (await this.isNpmInstalledLocally()) return this.localNpm;

    throw new Error("npm not installed");
  }

  async npmPath(): Promise<string | null> {
    if (await this.isNpmInstalledGlobally()) {
      return await which("npm", { nothrow: true });
    }

    if (await this.isNpmInstalledLocally()) return this.localNpm;

    return null;
  }

  async installIfNeeded() {
    if (this.alreadyInstalled || (await this.isNodeInstalledGlobally()) || (await this.isNodeInstalledLocally())) {
      this.alreadyInstalled = true;
      return;
    }

    return this.install();
  }

  async install() {
    const platform = os.platform();
    const arch = os.arch();
    const packagePath = await this.downloadNodePackage(platform, arch);
    const unzipDir = await this.unzipPackage(packagePath);

    this.alreadyInstalled = true;

    return unzipDir;
  }

  async listPackages(): Promise<string[]> {
    const response = await this.client.get(`/dist/latest/`);
    const doc = await cheerio.load(response.data);
    const allFileLinks = doc("a")
      .map((i, el) => doc(el).attr("href"))
      .toArray();
    const archiveFiles = A(allFileLinks).select((filename) => filename.match(/.*\.(gz|zip|xz)/));
    const urls = A(archiveFiles).map((filename) => `https://nodejs.org/dist/latest/${filename}`);
    return urls;
  }

  // returns the path to the downloaded zip file
  async downloadNodePackage(platform: string, arch: string): Promise<string> {
    // const url = match([platform, arch])
    //   .with(["linux", "x64"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-linux-x64.tar.xz")
    //   .with(["linux", "arm"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-linux-armv7l.tar.xz")
    //   .with(["linux", "arm64"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-linux-arm64.tar.xz")
    //   .with(["win32", "x64"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-win-x64.zip")
    //   .with(["win32", "arm64"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-win-arm64.zip")
    //   .with(["darwin", "x64"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-darwin-x64.tar.gz")
    //   .with(["darwin", "arm64"], () => "https://nodejs.org/dist/v22.4.1/node-v22.4.1-darwin-arm64.tar.gz")
    //   .otherwise(() => {
    //     throw new Error(`Unable to download node for OS/architecture: ${os}/${arch}`);
    //   });

    const platformInFilename = match(platform)
      .with("linux", () => "linux")
      .with("win32", () => "win")
      .with("darwin", () => "darwin")
      .otherwise(() => "unknown-platform");

    const archInFilename = match(arch)
      .with("x64", () => "x64")
      .with("x86", () => "x86")
      .with("arm", () => "armv7l")
      .with("arm64", () => "arm64")
      .otherwise(() => "unknown-arch");

    const packages = await this.listPackages();
    const url = A(packages).find((url) => url.match(`node-v.*-${platformInFilename}-${archInFilename}`));
    if (V.isAbsent(url)) {
      throw new Error(`Unable to download node for ${os}/${arch} OS/architecture`);
    }

    const filename = File.basename(url);
    const path = File.join(this.tmpDir, filename);

    if (File.exists(path)) return path;

    // console.log(`downloading ${url} to ${path}`);
    return await downloadFile(url, path);
  }

  // returns the path to the unzipped package directory
  async unzipPackage(packagePath: string): Promise<string> {
    const dir = File.join(this.tmpDir, NodeRuntime.Name);

    if (File.exists(dir)) return dir;

    // console.log(`unzipping ${packagePath} to ${dir}`);
    await unarchive(packagePath, dir);
    return dir;
  }

  async npmInstall(omitDev = true, cwd?: string): Promise<CommandResult> {
    // const result = await ShellCommand.fromString(`bun install --no-save --production`, directory).run();
    // const result = await ShellCommand.fromString(`npm install --omit=dev`, directory).run();

    if (omitDev) {
      return this.npm("install --omit=dev", cwd);
    } else {
      return this.npm("install", cwd);
    }
  }

  async npm(npmArgs: string, cwd?: string): Promise<CommandResult> {
    const npmCmd = await this.npmCmd();

    return ShellCommand.fromString(`${npmCmd} ${npmArgs}`.trim(), cwd).run();
  }

  async node(nodeArgs: string, cwd?: string): Promise<CommandResult> {
    const nodeCmd = await this.nodeCmd();

    return ShellCommand.fromString(`${nodeCmd} ${nodeArgs}`.trim(), cwd).run();
  }
}
