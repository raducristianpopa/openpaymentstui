import { command } from "#/cli/command";
import { app } from "../app";

export const SpawnCommand = command({
  command: "$0",
  describe: "start open payments tui",
  handler: () => {
    app();
  },
});
