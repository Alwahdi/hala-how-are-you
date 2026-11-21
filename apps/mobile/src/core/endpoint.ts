import { Endpoint, PilotError } from "./types";
export const latin = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) - (c <= "٩" ? 1632 : 1776)));
export function endpoint(raw: string, portText = "8729", portEdited = false): Endpoint {
  let value = latin(raw).trim();
  if (!value || /[\u0000-\u0020\\]/.test(value) || /^(?!https?:)[a-z][a-z\d+.-]*:\/\//i.test(value))
    throw new PilotError("address");
  value = value.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]!;
  if (value.includes("@")) throw new PilotError("address");
  let host: string, pasted: string | undefined;
  if (value.startsWith("[")) {
    const match = /^\[([0-9a-f:.]+)\](?::(\d+))?$/i.exec(value);
    if (!match) throw new PilotError("address");
    host = match[1]!;
    pasted = match[2];
    try {
      new URL("http://[" + host + "]/");
    } catch {
      throw new PilotError("address");
    }
  } else {
    if ((value.match(/:/g) || []).length > 1) throw new PilotError("address");
    [host, pasted] = value.split(":");
    if (!host || (value.includes(":") && !pasted)) throw new PilotError("address");
    if (/^[\d.]+$/.test(host)) {
      const parts = host.split(".");
      if (
        parts.length !== 4 ||
        parts.some((v) => !/^\d{1,3}$/.test(v) || Number(v) > 255 || (v.length > 1 && v[0] === "0"))
      )
        throw new PilotError("address");
    } else if (
      host.length > 253 ||
      host.split(".").some((v) => !/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(v))
    )
      throw new PilotError("address");
  }
  const text = pasted ?? latin(portText).trim();
  if (!/^\d{1,5}$/.test(text) || Number(text) < 1 || Number(text) > 65535)
    throw new PilotError("port");
  return {
    host: host.toLowerCase(),
    port: Number(text),
    explicitPort: pasted !== undefined || portEdited,
  };
}
