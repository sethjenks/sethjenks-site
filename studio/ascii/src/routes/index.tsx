import * as React from "react";

import { ToolcraftApp } from "@/toolcraft/runtime/react";

import "../app/ascii-studio.css";
import "../app/geist-mono";
import {
  createAsciiStudioSchema,
  type AuthoringBootstrap,
} from "../app/app-schema";
import { handleAsciiPanelAction } from "../app/panel-actions";
import { AsciiCanvas } from "../app/renderer/ascii-canvas";

const emptyBootstrap: AuthoringBootstrap = { entries: [], inbox: [] };

export function AppHome(): React.JSX.Element {
  const [bootstrap, setBootstrap] =
    React.useState<AuthoringBootstrap>(emptyBootstrap);

  React.useEffect(() => {
    let cancelled = false;

    void fetch("/api/journal/bootstrap")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Bootstrap request failed with ${response.status}.`);
        }
        return (await response.json()) as AuthoringBootstrap;
      })
      .then((data) => {
        if (!cancelled) setBootstrap(data);
      })
      .catch(() => {
        if (!cancelled) setBootstrap(emptyBootstrap);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const schema = React.useMemo(
    () => createAsciiStudioSchema(bootstrap),
    [bootstrap],
  );
  const schemaKey = React.useMemo(() => JSON.stringify(bootstrap), [bootstrap]);

  return (
    <ToolcraftApp
      canvasContent={<AsciiCanvas />}
      className="h-dvh min-h-dvh"
      key={schemaKey}
      onPanelAction={handleAsciiPanelAction}
      renderDefaultCanvasMedia={false}
      schema={schema}
    />
  );
}
