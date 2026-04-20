import { hostname } from "node:os";
import type { OopsieServerInfo } from "@oopsie-exceptions/core";

export function nodeServerInfo(): OopsieServerInfo {
  let host: string | null = null;
  try {
    host = hostname();
  } catch {
    host = null;
  }
  return {
    hostname: host,
    pid: typeof process !== "undefined" ? process.pid : null,
    ruby_version: null,
    node_version: typeof process !== "undefined" ? process.version : null,
  };
}
