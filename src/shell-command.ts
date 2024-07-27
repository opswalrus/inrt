import spawnAsync from "@expo/spawn-async";
// import { execa, ExecaError, type Result, type ResultPromise } from "execa";
import { Command, CommandResult } from "./command.ts";
import { signalsByName, type SignalName } from "human-signals";

export class ShellCommand extends Command {
  static fromString(command: string, cwd?, env?): ShellCommand {
    const { cmd, args } = this.parse(command, env);
    // console.log("111", cmd, args)
    return new ShellCommand({ cmd, args, cwd, env });
  }

  async run(): Promise<CommandResult> {
    try {
      // console.log(`> ${this.cmd} ${this.args}`);
      const resultPromise = spawnAsync(this.cmd, this.args, {
        cwd: this.cwd,
        env: this.env,
      });

      let { pid, stdout, stderr, status, signal } = await resultPromise;

      const signalObj = (signal && signalsByName[signal as SignalName]) || undefined;
      const commandResult = new CommandResult(stdout || "", stderr || "", status || 0, signalObj);
      this.result = commandResult;
    } catch (error) {
      // The error object also has the same properties as the result object (see https://github.com/expo/spawn-async/blob/main/src/spawnAsync.ts#L84)
      // console.error(error.stack);
      let { pid, stdout, stderr, status, signal } = error;

      const signalObj = (signal && signalsByName[signal as SignalName]) || undefined;
      const commandResult = new CommandResult(stdout || "", stderr || "", status || 1, signalObj);
      this.result = commandResult;
    }
    return this.result;
  }
}
