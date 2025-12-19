import { TextAttributes } from "@opentui/core";

export function Keybinds({ text }: { text: string }) {
  return (
    <text alignSelf="center" marginTop="auto" attributes={TextAttributes.DIM}>
      {text}
    </text>
  );
}
