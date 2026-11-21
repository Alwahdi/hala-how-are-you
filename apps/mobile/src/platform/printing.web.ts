import { Issue, Language, PilotError } from "../core/types";
export async function printIssue(_issue: Issue, _language: Language): Promise<void> {
  throw new PilotError("unsupported");
}
export async function exportIssue(_issue: Issue, _language: Language): Promise<void> {
  throw new PilotError("unsupported");
}
