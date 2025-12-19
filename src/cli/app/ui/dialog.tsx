import { RGBA } from "@opentui/core";
import { useTerminalDimensions, useRenderer } from "@opentui/solid";
import type { ParentProps } from "solid-js";

export function Dialog(
  props: ParentProps<{
    title?: string;
    size?: "medium" | "large";
    onClose?: () => void;
  }>,
) {
  const dimensions = useTerminalDimensions();
  const renderer = useRenderer();

  return (
    <box
      onMouseUp={async () => {
        props.onClose?.();
      }}
      width={dimensions().width}
      height={dimensions().height}
      alignItems="center"
      position="absolute"
      paddingTop={dimensions().height / 8}
      left={0}
      top={0}
    >
      <box
        title={props.title}
        border
        onMouseUp={async (e) => {
          if (renderer.getSelection()) return;
          e.stopPropagation();
        }}
        width={props.size === "large" ? 80 : 60}
        maxWidth={dimensions().width - 2}
        backgroundColor={RGBA.fromInts(18, 18, 18, 100)}
      >
        {props.children}
      </box>
    </box>
  );
}
