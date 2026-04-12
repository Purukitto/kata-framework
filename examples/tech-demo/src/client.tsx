import { hydrateRoot } from "react-dom/client";
import type { KSONScene } from "@kata-framework/core";
import { App } from "./App";

declare global {
  interface Window {
    __SCENES__: string;
    __LOCALES__: string;
  }
}

const scenes: KSONScene[] = JSON.parse(window.__SCENES__);
const locales = JSON.parse(window.__LOCALES__);
const root = document.getElementById("root")!;

hydrateRoot(root, <App scenes={scenes} locales={locales} />);
