import { render } from "@opentui/solid";

export function flowBuilder() {
  render(() => (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box justifyContent="center" alignItems="flex-end">
        <ascii_font font="tiny" text="flow builder" />
      </box>
    </box>
  ));
}
