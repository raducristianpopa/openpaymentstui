import type { CommandModule } from "yargs";

export function command<T>(input: CommandModule<T>) {
  return input;
}
