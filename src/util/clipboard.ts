import { $ } from "bun";
import { platform } from "os";
import clipboardy from "clipboardy";
import { lazy } from "#/util/lazy";

export namespace Clipboard {
  export interface Content {
    data: string;
    mime: string;
  }

  const getCopyMethod = lazy(() => {
    const os = platform();

    if (os === "darwin" && Bun.which("osascript")) {
      return async (text: string) => {
        const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        await $`osascript -e 'set the clipboard to "${escaped}"'`
          .nothrow()
          .quiet();
      };
    }

    if (os === "linux") {
      if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-copy")) {
        return async (text: string) => {
          const proc = Bun.spawn(["wl-copy"], {
            stdin: "pipe",
            stdout: "ignore",
            stderr: "ignore",
          });
          proc.stdin.write(text);
          proc.stdin.end();
          await proc.exited.catch(() => {});
        };
      }
      if (Bun.which("xclip")) {
        return async (text: string) => {
          const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
            stdin: "pipe",
            stdout: "ignore",
            stderr: "ignore",
          });
          proc.stdin.write(text);
          proc.stdin.end();
          await proc.exited.catch(() => {});
        };
      }
      if (Bun.which("xsel")) {
        return async (text: string) => {
          const proc = Bun.spawn(["xsel", "--clipboard", "--input"], {
            stdin: "pipe",
            stdout: "ignore",
            stderr: "ignore",
          });
          proc.stdin.write(text);
          proc.stdin.end();
          await proc.exited.catch(() => {});
        };
      }
    }

    if (os === "win32") {
      return async (text: string) => {
        const escaped = text.replace(/"/g, '""');
        await $`powershell -command "Set-Clipboard -Value \"${escaped}\""`
          .nothrow()
          .quiet();
      };
    }

    return async (text: string) => {
      await clipboardy.write(text).catch(() => {});
    };
  });

  export async function copy(text: string): Promise<void> {
    await getCopyMethod()(text);
  }
}
