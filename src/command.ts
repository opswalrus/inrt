import type { Signal } from "human-signals";
import { A } from "@opswalrus/percolate/array";
import { V } from "@opswalrus/percolate/type";
import { parse } from "shell-quote";

export type EnvVarObj = {
  [key: string]: string | undefined;
};

export class CommandResult {
  constructor(public stdout: string, public stderr: string, public exitCode: number, public signal?: Signal) {}

  toJSON() {
    return {
      stdout: this.stdout,
      stderr: this.stderr,
      exitCode: this.exitCode,
      signal: this.signal,
      success: this.success,
      failure: this.failure,
    };
  }
  get out() {
    return this.stdout;
  }
  get err() {
    return this.stderr;
  }
  get exit() {
    return this.exitCode;
  }
  get sig() {
    return this.signal;
  }
  get success() {
    return this.exitCode === 0;
  }
  get failure() {
    return !this.success;
  }
}

export class Command {
  // static createInstance<T extends Command>(
  //   ctor: new (opts: {
  //     cmd: string;
  //     args?: string[];
  //     cwd?: string;
  //     env?: { readonly [key: string]: string | undefined };
  //     result?: CommandResult;
  //   }) => T,
  //   opts: {
  //     cmd: string;
  //     args?: string[];
  //     cwd?: string;
  //     env?: { readonly [key: string]: string | undefined };
  //     result?: CommandResult;
  //   }
  // ): T {
  //   return new ctor(opts);
  // }

  static parse(
    commandString: string,
    env?
  ): {
    cmd: string;
    args: string[];
    env?: EnvVarObj;
  } {
    const parts = parse(commandString, env);

    const cmd: string = A.head(parts);
    // console.log(cmd);
    const parsedArgs = A(parts).skipFirst(1);
    // console.log(parsedArgs);

    const mappedArgs = parsedArgs.map((parsedArg) => {
      // parsedArg is one of the following alternatives:
      // | string
      // | { op: ControlOperator }
      // | { op: "glob"; pattern: string }
      // | { comment: string };

      if (V(parsedArg).isA(String)) {
        return parsedArg;
      }

      const { op, pattern } = parsedArg;
      if (op) {
        if (pattern) {
          return pattern;
        } else {
          return op;
        }
      }

      const { comment } = parsedArg;
      if (comment) {
        return null;
      }
    });

    const args: string[] = A(mappedArgs).compact();
    // console.log(args);

    return {
      cmd,
      args,
      env,
    };
  }

  public cmd;
  public args?;
  public cwd?: string;
  public env?: EnvVarObj;
  public result?: CommandResult;

  constructor(opts: { cmd: string; args?: string[]; cwd?: string; env?: EnvVarObj; result?: CommandResult }) {
    const { cmd, args, cwd, env, result } = opts;
    this.cmd = cmd;
    this.args = args;
    this.cwd = cwd;
    this.env = env;
    this.result = result;
  }

  isRunning(): boolean {
    return !!this.result;
  }

  toJSON() {
    return {
      cmd: this.cmd,
      args: this.args,
      cwd: this.cwd,
      env: this.env,
      result: this.result?.toJSON(),
    };
  }
}
