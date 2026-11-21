import { Journal, PilotError } from "../core/types";
export async function openJournal(): Promise<Journal> {
  throw new PilotError("unsupported");
}
