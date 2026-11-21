import React from "react";
import { Issue, Plan } from "../core/types";
import { dataLabel } from "../core/records";
import { latin } from "../core/endpoint";
import { Button, Fact, Field, Notice, Panel, Txt, useWords } from "./primitives";
export type IssueDraft = {
  planKey: string;
  manual: boolean;
  name: string;
  mb: string;
  minutes: string;
};
export const planKey = (p: Plan) => p.source + ":" + p.id;
export function IssueForm({
  plans,
  draft,
  setDraft,
  prepare,
  busy,
}: {
  plans: Plan[];
  draft: IssueDraft;
  setDraft: (value: IssueDraft) => void;
  prepare: () => void;
  busy: boolean;
}) {
  const { t } = useWords(),
    selected = plans.find((p) => planKey(p) === draft.planKey);
  return (
    <>
      <Txt title>{t("إصدار كرت واحد", "Issue one voucher")}</Txt>
      <Txt>{t("اختر باقته من هذا الراوتر", "Choose a plan from this router")}</Txt>
      {plans.map((p) => (
        <Panel key={planKey(p)}>
          <Txt>{p.name}</Txt>
          <Txt small>
            {p.source === "hotspot"
              ? t("Hotspot · حساب محلي", "Hotspot · local account")
              : "User Manager"}{" "}
            ·{" "}
            {p.bytes === null
              ? t("الحجم غير محدد في قراءة الباقة", "Data limit not in this plan reading")
              : dataLabel(p.bytes)}
          </Txt>
          <Button
            disabled={busy || !p.supported}
            primary={draft.planKey === planKey(p)}
            onPress={() =>
              setDraft({
                ...draft,
                planKey: planKey(p),
                mb: p.bytes === null ? "" : String(p.bytes / 1e6),
                minutes: p.seconds === null ? "" : String(p.seconds / 60),
              })
            }
          >
            {!p.supported
              ? t("تعريف مركب يحتاج تحققًا", "Complex plan needs verification")
              : draft.planKey === planKey(p)
                ? t("الباقة المختارة", "Selected plan")
                : t("اختيار هذه الباقة", "Choose this plan")}
          </Button>
        </Panel>
      ))}
      {selected ? (
        <Panel>
          <Button disabled={busy} onPress={() => setDraft({ ...draft, manual: !draft.manual })}>
            {draft.manual
              ? t("أستخدم رقمًا مولدًا", "Use a generated number")
              : t("أريد كتابة الرقم بنفسي", "Choose my own number")}
          </Button>
          {draft.manual ? (
            <Field
              label={t("رقم دخول مخصص", "Custom login")}
              value={draft.name}
              onChangeText={(v) => setDraft({ ...draft, name: latin(v) })}
              autoCorrect={false}
              autoCapitalize="none"
            />
          ) : (
            <Txt small>
              {t(
                "سنولد رقمًا ونفحص عدم وجوده قبل الإصدار.",
                "We generate a number and check for conflicts before issuing.",
              )}
            </Txt>
          )}
          {selected.source === "hotspot" ? (
            <>
              <Notice>
                {t(
                  "هذه الباقة لا تحمل حد المستخدم في قراءتها. حدد الحقوق صراحة؛ لا ننسخ حدود كرت قديم.",
                  "This profile reading does not specify per-user limits. Set them explicitly; no limits are copied from older vouchers.",
                )}
              </Notice>
              <Field
                label={t("حجم الإنترنت MB", "Data allowance MB")}
                value={draft.mb}
                onChangeText={(v) => setDraft({ ...draft, mb: latin(v).replace("٫", ".") })}
                keyboardType="decimal-pad"
              />
              <Field
                label={t("وقت الاتصال بالدقائق", "Online time in minutes")}
                value={draft.minutes}
                onChangeText={(v) => setDraft({ ...draft, minutes: latin(v) })}
                keyboardType="number-pad"
              />
              <Txt small>
                {t(
                  "الصلاحية تتبع إعداد الباقة الموجود؛ لا نضيف أو نعدّل سكربتات الراوتر.",
                  "Calendar validity follows the existing profile configuration; no router scripts are added or changed.",
                )}
              </Txt>
            </>
          ) : (
            <Fact
              label={t("حقوق الباقة", "Plan allowance")}
              value={
                dataLabel(selected.bytes) +
                " · " +
                (selected.seconds === null ? "—" : selected.seconds / 60 + " min")
              }
            />
          )}
          <Button disabled={busy} primary onPress={prepare}>
            {t("التالي: مراجعة الإصدار", "Next: review issuance")}
          </Button>
        </Panel>
      ) : (
        <Notice>
          {t(
            "لم نختَر باقة نيابة عنك؛ قد تتكرر أسماؤها بين النظامين.",
            "No plan was selected for you; names can repeat across sources.",
          )}
        </Notice>
      )}
    </>
  );
}
export function IssueReview({
  issue,
  confirm,
  back,
  busy,
}: {
  issue: Issue;
  confirm: () => void;
  back: () => void;
  busy: boolean;
}) {
  const { t } = useWords();
  return (
    <>
      <Txt title>{t("راجع ثم أكد", "Review, then confirm")}</Txt>
      <Panel>
        <Txt latin>{issue.name}</Txt>
        <Fact label={t("الباقة", "Plan")} value={issue.plan.name} />
        <Fact
          label={t("المصدر", "Source")}
          value={issue.plan.source === "hotspot" ? "Hotspot" : "User Manager"}
        />
        <Fact label={t("حجم الإنترنت", "Data")} value={dataLabel(issue.bytes)} />
        <Fact
          label={t("وقت الاتصال", "Online time")}
          value={
            issue.seconds === null
              ? t("حسب الباقة", "As configured")
              : issue.seconds / 60 + t(" دقيقة", " minutes")
          }
        />
        <Fact
          label={t("الصلاحية", "Validity")}
          value={
            issue.plan.validity ||
            t("حسب إعداد الباقة، غير مؤكدة من القراءة", "As configured; not established by reading")
          }
        />
      </Panel>
      <Notice>
        {issue.demo
          ? t(
              "تجربة فقط: سنحاكي إنشاء كرت دون الاتصال بأي راوتر.",
              "Demo only: voucher creation is simulated without contacting any router.",
            )
          : t(
              "سيُنشأ حساب واحد على الراوتر المختار. لا نعلن نجاحه قبل التحقق، ولا نكرر الإضافة عند فقد الرد.",
              "One account will be created on the selected router. Success requires verification; a lost reply never triggers a duplicate add.",
            )}
      </Notice>
      <Button primary busy={busy} onPress={confirm}>
        {issue.demo
          ? t("تجربة إصدار الكرت", "Simulate voucher issuance")
          : t("تأكيد إصدار كرت على راوتر الاختبار", "Confirm voucher issuance on test router")}
      </Button>
      <Button disabled={busy} onPress={back}>
        {t("رجوع للتعديل", "Back to edit")}
      </Button>
    </>
  );
}
