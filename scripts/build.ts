import solidPlugin from "../node_modules/@opentui/solid/scripts/solid-plugin";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "browser",
  outdir: "./build",
  plugins: [solidPlugin],
  compile: {
    target: "bun-darwin-arm64",
    outfile: "app-macos",
  },
});
