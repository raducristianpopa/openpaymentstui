import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Database } from "./database/sql";
import { VERSION } from "./version";
import { SpawnCommand } from "./cli/commands/spawn";
import { FlowBuildCommand } from "./cli/commands/flow-build";
import { FlowRunCommand } from "./cli/commands/flow-run";

await Database.init();

process.on("unhandledRejection", (e) => {
  console.error("rejection", e instanceof Error ? e.message : e);
});

process.on("uncaughtException", (e) => {
  console.error("exception", e instanceof Error ? e.message : e);
});

const cli = yargs(hideBin(process.argv))
  .scriptName("openpaymentstui")
  .version("version", "Open Payments TUI version", VERSION)
  .alias("version", "v")
  .command(SpawnCommand)
  .command(FlowBuildCommand)
  .command(FlowRunCommand)
  .strict();

await cli.parse();
