import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Cairo_400Regular } from "@expo-google-fonts/cairo";
import { Issue, Language } from "../core/types";
import { printHtml } from "../core/print";
let font: string | undefined;
async function html(issue: Issue, language: Language) {
  if (!font) {
    const asset = Asset.fromModule(Cairo_400Regular);
    await asset.downloadAsync();
    font = await new File(asset.localUri || asset.uri).base64();
  }
  return printHtml(issue, language, font);
}
export async function printIssue(issue: Issue, language: Language) {
  await Print.printAsync({ html: await html(issue, language) });
}
export async function exportIssue(issue: Issue, language: Language) {
  const file = await Print.printToFileAsync({
    html: await html(issue, language),
    width: 595,
    height: 842,
    base64: false,
  });
  try {
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: ".pdf" });
  } finally {
    new File(file.uri).delete();
  }
}
