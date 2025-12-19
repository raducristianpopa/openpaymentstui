import { command } from "#/cli/command";
import type { Argv } from "yargs";

export const FlowRunCommand = command({
  command: "run <path_to_flow>",
  describe: "flow runner (no tui)",
  builder: (yargs: Argv) => {
    return yargs.positional("path_to_flow", {
      describe: "path to flow",
      type: "string",
      demandOption: true,
    });
  },
  handler: (args) => {
    console.log(args);
  },
});
