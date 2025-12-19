import type { Models } from "#/database/models";
import { Mutation } from "#/database/mutation";
import { Query } from "#/database/query";
import { OpenPayments } from "#/open-payments";
import type { AuthenticatedClient } from "@interledger/open-payments";

/*
 * Current commands:
 *  - select [connected_wallet_address]
 *  - send [amount] [receiver] [repeat_times]
 *
 * Ideas:
 *  - concurrent send [...]
 *  - webmon [amount] [receiver] [time] [interval]
 *  - send $0 [receiver] [repeat_times] // where $0 is the amoun and a variable that the user can provide before the flow starts
 *  - request [amount] [receiver] // create an incoming payment and use it in the send command
 *
 * Hmm?:
 *  select https://...
 *  send 10..50 random([wallet_address_one, wallet_address_two, wallet_address_three]) ( // random amount between 10 and 50 and a random wallet address picked from the list
 *    with cover_fees               // debit/receive
 *    ensure completed $incoming
 *    ensure completed $outgoing
 *    send 10 $incoming             // this would be the selected wallet address, $0 would be the amount
 *    ensure failed $incoming       // cannot send to a completed incoming payment
 *  )
 */

export namespace FlowEngine {
  export type Command =
    | { kind: "select"; walletAddress: string; line: number }
    | {
        kind: "send";
        amount: number;
        receiver: string;
        repeat: number;
        line: number;
      };

  export interface ParseContext {
    line: number;
    raw: string;
    parts: string[];
  }
  export type ParseResult = Command;

  type CommandHandler<K extends Command["kind"]> = (
    cmd: Extract<Command, { kind: K }>,
    ctx: RunnerContext,
  ) => AsyncGenerator<StepEvent>;

  export interface State {
    selectedWalletAddress: Models.WalletAddress | null;
    client: AuthenticatedClient | null;
  }

  export type StepEvent =
    | { type: "start" }
    | { type: "log"; level: "info" | "ok" | "warn" | "error"; message: string }
    | { type: "done" };

  interface RunnerContext {
    state: State;
    yield: (e: StepEvent) => void;
  }

  interface CommandSpec<K extends Command["kind"]> {
    name: string;
    parse: (ctx: ParseContext) => Command;
    run: CommandHandler<K>;
  }

  function required(s: string | undefined, label: string, line: number) {
    if (!s) throw new Error(`Line ${line}: ${label} is required`);
    return s;
  }
  function number(s: string | undefined, label: string, line: number) {
    const v = Number(s);
    if (!Number.isFinite(v))
      throw new Error(`Line ${line}: ${label} must be a number`);
    return v;
  }

  function positiveInt(s: string | undefined, label: string, line: number) {
    const v = number(s, label, line);
    if (!Number.isInteger(v) || v <= 0)
      throw new Error(`Line ${line}: ${label} must be a positive integer`);
    return v;
  }

  const pos = (s: string | undefined, label: string, line: number) => {
    const v = number(s, label, line);
    if (v <= 0) throw new Error(`Line ${line}: ${label} must be > 0`);
    return v;
  };

  export const COMMANDS = {
    select: {
      name: "select",
      parse: ({ line, parts }: ParseContext): Command => ({
        kind: "select",
        walletAddress: required(parts[1], "wallet address", line),
        line,
      }),
      async *run(cmd, { state }: RunnerContext) {
        yield {
          type: "log",
          level: "info",
          message: `Selecting "${cmd.walletAddress}"...`,
        };

        try {
          const wallet = await Query.getWallet(cmd.walletAddress);
          state.selectedWalletAddress = wallet;
          yield {
            type: "log",
            level: "ok",
            message: `Selected "${cmd.walletAddress}"`,
          };
        } catch (e: any) {
          yield {
            type: "log",
            level: "error",
            message: `Could not select wallet: ${e.message}`,
          };
          return;
        }
      },
    } satisfies CommandSpec<"select">,
    send: {
      name: "send",
      parse: ({ line, parts }: ParseContext): Command => ({
        kind: "send",
        amount: pos(parts[1], "amount", line),
        receiver: required(parts[2], "receiver", line),
        repeat: positiveInt(parts[3] ?? "1", "repeat_times", line),
        line,
      }),
      async *run(cmd, { state }: RunnerContext) {
        if (!state.selectedWalletAddress) {
          yield {
            type: "log",
            level: "error",
            message: `Line ${cmd.line}: run "select ..." first`,
          };
          return;
        }

        yield {
          type: "log",
          level: "info",
          message: `Getting Open Payments client for "${state.selectedWalletAddress.url}"...`,
        };

        let client = OpenPayments.getClient(state.selectedWalletAddress.url);
        if (!client) {
          client = await OpenPayments.init(
            state.selectedWalletAddress.url,
            state.selectedWalletAddress.privateKey,
            state.selectedWalletAddress.keyId,
          );
        }

        state.client = client;

        yield {
          type: "log",
          level: "info",
          message: `Sending ${cmd.amount} to "${cmd.receiver}" x${cmd.repeat}`,
        };

        for (let i = 1; i <= cmd.repeat; i++) {
          yield {
            type: "log",
            level: "info",
            message: `  - [${i}/${cmd.repeat}] Getting receiver information...`,
          };

          const receiver = await OpenPayments.getWallet(
            state.client,
            cmd.receiver,
          );

          yield {
            type: "log",
            level: "info",
            message: `  - [${i}/${cmd.repeat}] Creating incoming payment grant...`,
          };

          const grant = await OpenPayments.createIncomingPaymentGrant(
            state.client,
            receiver.authServer,
            receiver.id,
          );

          yield {
            type: "log",
            level: "info",
            message: `  - [${i}/${cmd.repeat}] Creating incoming payment...`,
          };

          const incomingPayment = await OpenPayments.createIncomingPayment(
            state.client,
            receiver.resourceServer,
            grant.access_token.value,
            receiver.id,
          );

          yield {
            type: "log",
            level: "info",
            message: `  - [${i}/${cmd.repeat}] Getting sender information...`,
          };

          const sender = await OpenPayments.getWallet(
            state.client,
            state.selectedWalletAddress.url,
          );

          yield {
            type: "log",
            level: "info",
            message: `  - [${i}/${cmd.repeat}] Creating outgoing payment...`,
          };

          let accessToken = state.selectedWalletAddress.token;
          while (true) {
            try {
              await OpenPayments.createOutgoingPayment(
                client,
                sender,
                incomingPayment.id,
                cmd.amount,
                accessToken,
              );
              break;
            } catch (err) {
              console.error("createOutgoingPayment error", err);
              if (OpenPayments.isTokenExpiredError(err)) {
                yield {
                  type: "log",
                  level: "info",
                  message: `  - [${i}/${cmd.repeat}] Token expired, rotating...`,
                };
                const rotated = await OpenPayments.rotateToken(
                  client,
                  accessToken,
                  state.selectedWalletAddress.manageUrl,
                );
                accessToken = rotated.access_token.value;
                await Mutation.updateToken(
                  state.selectedWalletAddress.url,
                  accessToken,
                  rotated.access_token.manage,
                );

                state.selectedWalletAddress.token = rotated.access_token.value;
                state.selectedWalletAddress.manageUrl =
                  rotated.access_token.manage;
              }
            }
          }

          yield {
            type: "log",
            level: "ok",
            message: `  - [${i}/${cmd.repeat}] Transfer complete`,
          };

          // TODO: Poll without blocking and let the other payments run
          // if cmd.repeat > 1
        }
      },
    } satisfies CommandSpec<"send">,
  };

  export function parse(text: string): Array<FlowEngine.Command> {
    const commands: Array<FlowEngine.Command> = [];

    const lines = text.split(/\r?\n/);

    for (const [i, line] of lines.entries()) {
      if (canIgnoreLine(line)) continue;

      const parts = line.trim().split(/\s+/);
      const name = parts[0] as keyof typeof FlowEngine.COMMANDS;

      const spec = FlowEngine.COMMANDS[name];
      if (!spec) {
        throw new Error(`Line ${i + 1}: unknown command "${parts[0]}"`);
      }

      commands.push(spec.parse({ line: i + 1, raw: line, parts }));
    }

    return commands;
  }

  function canIgnoreLine(line: string) {
    const t = line.trim();
    return t === "";
  }

  export async function* run(cmds: Command[]): AsyncGenerator<StepEvent> {
    const state: State = {
      selectedWalletAddress: null,
      client: null,
    };

    const ctx: RunnerContext = {
      state,
      yield: () => void 0,
    };

    yield {
      type: "log",
      level: "ok",
      message: `Starting flow...`,
    };

    for (const cmd of cmds) {
      const spec = COMMANDS[cmd.kind];
      yield* spec.run(cmd as any, ctx);
    }

    yield {
      type: "log",
      level: "ok",
      message: `Done`,
    };
  }

  export async function* start(context: string): AsyncGenerator<StepEvent> {
    let commands: Array<Command> = [];
    try {
      commands = parse(context);
    } catch (e: any) {
      yield {
        type: "log",
        level: "error",
        message: `Parse error: ${e?.message ?? String(e)}`,
      };
      return;
    }

    yield {
      type: "log",
      level: "ok",
      message: `Parsed ${commands.length} command(s)`,
    };

    yield* run(commands);
  }
}
