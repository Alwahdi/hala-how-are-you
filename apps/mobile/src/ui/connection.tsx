import React from "react";
import { View } from "react-native";
import { Button, Field, Notice, Panel, Txt, useWords } from "./primitives";
import { latin } from "../core/endpoint";
export type ConnectionDraft = {
  raw: string;
  port: string;
  portEdited: boolean;
  username: string;
  password: string;
  reveal: boolean;
};
export function Connection({
  draft,
  setDraft,
  connect,
  busy,
  cancel,
}: {
  draft: ConnectionDraft;
  setDraft: (value: ConnectionDraft) => void;
  connect: () => void;
  busy: boolean;
  cancel: () => void;
}) {
  const { t, ar } = useWords();
  const set = (key: keyof ConnectionDraft, value: string | boolean) =>
    setDraft({
      ...draft,
      [key]: key === "raw" && typeof value === "string" ? latin(value) : value,
    });
  return (
    <>
      <Txt title>{t("اربط راوتر الاختبار", "Connect your test router")}</Txt>
      <Panel>
        <View style={{ flexDirection: ar ? "row-reverse" : "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label={t("عنوان الراوتر", "Router address")}
              value={draft.raw}
              onChangeText={(value) => set("raw", value)}
              placeholder={t("رابط التحكم أو IP", "Remote host or IP")}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={{ writingDirection: "ltr", textAlign: "left" }}
            />
          </View>
          <View style={{ width: 86 }}>
            <Field
              label={t("المنفذ", "Port")}
              value={draft.port}
              onChangeText={(value) => setDraft({ ...draft, port: latin(value), portEdited: true })}
              keyboardType="number-pad"
              editable={!busy}
              style={{ textAlign: "center", fontFamily: undefined }}
            />
          </View>
        </View>
        <Txt small color="#b0bdaf">
          {t(
            "يمكن لصق رابط بمنفذ ومسار؛ سنفصل العنوان والمنفذ ونختبر الخدمة.",
            "Paste a URL with a port and path; we separate the host and port, then check the service.",
          )}
        </Txt>
        <Field
          label={t("اسم مستخدم الراوتر", "Router username")}
          value={draft.username}
          onChangeText={(value) => set("username", value)}
          autoCorrect={false}
          autoCapitalize="none"
          editable={!busy}
          style={{ writingDirection: "ltr", textAlign: "left" }}
        />
        <Field
          label={t("كلمة مرور الراوتر", "Router password")}
          value={draft.password}
          onChangeText={(value) => set("password", value)}
          secureTextEntry={!draft.reveal}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          style={{ writingDirection: "ltr", textAlign: "left" }}
        />
        <Button disabled={busy} onPress={() => set("reveal", !draft.reveal)}>
          {draft.reveal
            ? t("إخفاء كلمة المرور", "Hide password")
            : t("إظهار كلمة المرور", "Show password")}
        </Button>
        <Button testID="connect-router" onPress={connect} busy={busy} primary>
          {t("فحص الاتصال والدخول", "Check connection and continue")}
        </Button>
        {busy ? <Button onPress={cancel}>{t("إلغاء الاتصال", "Cancel connection")}</Button> : null}
      </Panel>
      <Notice>
        {t(
          "بيانات الدخول تبقى في ذاكرة الجلسة فقط. الربط لا يغير إعداد الراوتر أو يفتح منافذ.",
          "Login details stay only in session memory. Connecting changes no router settings or ports.",
        )}
      </Notice>
      <Panel>
        <Txt>{t("ما عندي بيانات الربط", "I need connection details")}</Txt>
        <Txt small>
          {t(
            "اطلب من المهندس عنوان IP أو DDNS، ومنفذ API، وحسابًا مناسبًا للفحص وإصدار كرت اختبار. منفذ API قد يختلف عن Winbox أو صفحة الويب. الاستكشاف لا يكشف كلمة المرور.",
            "Ask your engineer for an IP or DDNS host, API port, and an account permitted to inspect and issue a test voucher. The API port may differ from Winbox or the web page. Discovery cannot find passwords.",
          )}
        </Txt>
      </Panel>
    </>
  );
}
