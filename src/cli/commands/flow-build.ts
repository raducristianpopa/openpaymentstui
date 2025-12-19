import { command } from "#/cli/command";
import { flowBuilder } from "../flow-builder";

export const FlowBuildCommand = command({
  command: "builder",
  describe: "flow builder tui",
  handler: () => {
    flowBuilder();
  },
});
