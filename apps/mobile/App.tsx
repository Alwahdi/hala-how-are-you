import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Cairo_400Regular, Cairo_700Bold } from "@expo-google-fonts/cairo";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Archive, Boxes, House, Menu, Search } from "lucide-react-native";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";
import {
  Card,
  Endpoint,
  Issue,
  Journal,
  Language,
  PilotError,
  Plan,
  Router,
} from "./src/core/types";
import { Gateway } from "./src/core/gateway";
import { DemoGateway } from "./src/core/demo";
import { MemoryJournal } from "./src/core/memory";
import { assessment, dataLabel } from "./src/core/records";
import { endpoint, latin } from "./src/core/endpoint";
import { openJournal } from "./src/platform/journal";
import { connectLive, nativeAvailable } from "./src/platform/transport";
import { exportIssue, printIssue } from "./src/platform/printing";
import { Button, colors, Fact, Field, Locale, Notice, Panel, Txt } from "./src/ui/primitives";
import { Connection, ConnectionDraft } from "./src/ui/connection";
import { IssueDraft, IssueForm, IssueReview, planKey } from "./src/ui/issue";

type Screen =
  | "welcome"
  | "networks"
  | "connect"
  | "home"
  | "lookup"
  | "card"
  | "plans"
  | "issue"
  | "review"
  | "archive"
  | "result"
  | "more";
const initialConnection: ConnectionDraft = {
  raw: "",
  port: "8729",
  portEdited: false,
  username: "",
  password: "",
  reveal: false,
};
const initialIssue: IssueDraft = { planKey: "", manual: false, name: "", mb: "", minutes: "" };
const tabs = [
  { screen: "home", ar: "الرئيسية", en: "Home", Icon: House },
  { screen: "lookup", ar: "فحص", en: "Check", Icon: Search },
  { screen: "plans", ar: "الباقات", en: "Plans", Icon: Boxes },
  { screen: "archive", ar: "الأرشيف", en: "Archive", Icon: Archive },
  { screen: "more", ar: "المزيد", en: "More", Icon: Menu },
] as const;
const errorMessages: Record<string, [string, string]> = {
  address: [
    "راجع العنوان أو رقم الكرت؛ الأرقام لاتينية والاسم من 4 إلى 32 محرفًا عند الإصدار.",
    "Check the host or login; issuance logins use 4–32 Latin characters.",
  ],
  port: ["المنفذ رقم بين 1 و65535.", "The port must be between 1 and 65535."],
  unreachable: [
    "تعذر الوصول. راجع الشبكة والعنوان ومنفذ API.",
    "Unreachable. Check the network, host and API port.",
  ],
  timeout: [
    "انتهت مهلة الانتظار. إذا أرسل طلب إصدار فنتحقق منه قبل أي تكرار.",
    "Timed out. An issuance request must be verified before any retry.",
  ],
  certificate: [
    "تعذر التحقق من حماية الاتصال. راجع شهادة الراوتر والعنوان مع المهندس؛ لم نخفض الحماية أو نرسل الاعتماد لخدمة أخرى.",
    "TLS identity could not be verified. Check the certificate and hostname with your engineer; no security downgrade occurred.",
  ],
  auth: ["الراوتر رد لكنه رفض بيانات الدخول.", "The router responded but rejected the login."],
  "legacy-login": [
    "طريقة دخول قديمة غير مدعومة في هذه التجربة؛ راجع إصدار RouterOS.",
    "This legacy login method is not supported in the pilot.",
  ],
  rejected: [
    "رفض الراوتر الطلب. راجع الصلاحية والإعدادات؛ لا نجاح مؤكد.",
    "The router rejected the request. Check permissions and settings; success was not confirmed.",
  ],
  lost: [
    "انقطع الرد؛ نتيجة أي كتابة تبقى بانتظار التحقق.",
    "The reply was lost; any write outcome remains unverified.",
  ],
  cancelled: [
    "أُلغيت المحاولة. راجع الأرشيف إذا كان طلب إصدار قد أُرسل.",
    "Cancelled. Check the archive if an issuance request had been sent.",
  ],
  protocol: [
    "الرد ليس خدمة API مدعومة أو تجاوز حدود القراءة.",
    "The reply is not supported API data or exceeded the reading limit.",
  ],
  busy: [
    "يوجد إجراء جارٍ أو طلب لهذا الراوتر ينتظر التحقق. افتحه من الأرشيف.",
    "An operation is running or a router request awaits verification. Open it in the archive.",
  ],
  identity: [
    "هوية الراوتر لا تطابق السياق أو لا يمكن إثباتها؛ لم ننقل بيانات شبكة أخرى.",
    "Router identity is missing or does not match; no other network data was reused.",
  ],
  unsupported: [
    "هذه الإمكانية تحتاج نسخة التطوير الأصلية أو إعداد باقة مدعومًا. يمكنك تجربة الواجهة بالبيانات التوضيحية.",
    "This requires the native development build or a supported plan configuration. You can still use the demo.",
  ],
  conflict: [
    "الرقم موجود أو تغيرت الباقة. أعد المراجعة؛ لن نستبدل حسابًا أو رقمًا بصمت.",
    "The login exists or the plan changed. Review again; no account is silently replaced.",
  ],
  storage: [
    "تعذر فتح التخزين المشفر. الإصدار متوقف لحماية بياناته؛ تحتاج نسخة تطوير تدعم SQLCipher.",
    "Encrypted storage is unavailable. Issuance is blocked; a SQLCipher-enabled native build is required.",
  ],
  unknown: [
    "لم تثبت النتيجة بعد. لا تعِد الإصدار؛ افتح الطلب وتحقق منه.",
    "The outcome is not established. Do not issue again; open and verify the request.",
  ],
};
function stateLabel(state: Issue["state"], ar: boolean) {
  return {
    prepared: ["محفوظ قبل الإرسال", "Saved before sending"],
    sent: ["أرسل وبانتظار التحقق", "Sent, awaiting verification"],
    partial: ["حساب جزئي يحتاج استكمالًا", "Partial account needs completion"],
    unknown: ["النتيجة غير محسومة", "Unresolved outcome"],
    confirmed: ["مؤكد", "Confirmed"],
    rejected: ["مرفوض", "Rejected"],
    invalidated: ["تعذر إثبات بيانات التسليم", "Handover details not verified"],
  }[state][ar ? 0 : 1]!;
}
function ask(title: string, message: string, yes: string, no: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: no, style: "cancel", onPress: () => resolve(false) },
        { text: yes, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
export default function App() {
  const [fonts, fontError] = useFonts({ Cairo: Cairo_400Regular, CairoBold: Cairo_700Bold });
  const [language, setLanguage] = useState<Language>("ar"),
    ar = language === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const [screen, setScreen] = useState<Screen>("welcome"),
    [mode, setMode] = useState<"demo" | "live">("live");
  const [busy, setBusy] = useState(false),
    busyRef = useRef(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const journal = useRef<Journal | null>(null),
    gateway = useRef<Gateway | null>(null),
    controller = useRef<AbortController | null>(null);
  const [router, setRouter] = useState<Router | null>(null),
    [saved, setSaved] = useState<Router[]>([]),
    [plans, setPlans] = useState<Plan[]>([]),
    [unavailable, setUnavailable] = useState<string[]>([]);
  const [connection, setConnection] = useState(initialConnection),
    [issueDraft, setIssueDraft] = useState(initialIssue),
    [review, setReview] = useState<Issue | null>(null);
  const [lookup, setLookup] = useState(""),
    [cards, setCards] = useState<Card[]>([]),
    [selectedCard, setSelectedCard] = useState<Card | null>(null),
    [issues, setIssues] = useState<Issue[]>([]),
    [selectedIssue, setSelectedIssue] = useState<Issue | null>(null),
    [secret, setSecret] = useState(false);
  const [connected, setConnected] = useState(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", (value) => {
      if (value !== "active") {
        setSecret(false);
        setConnection((v) => ({ ...v, password: "", reveal: false }));
        if (mode === "live" && !busyRef.current) {
          gateway.current = null;
          setConnected(false);
        }
      }
    });
    return () => {
      mounted.current = false;
      controller.current?.abort();
      subscription.remove();
    };
  }, [mode]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (busyRef.current) return true;
      if (screen === "welcome") return false;
      setScreen(
        screen === "card" ? "lookup" : screen === "review" ? "issue" : router ? "home" : "networks",
      );
      setSecret(false);
      return true;
    });
    return () => subscription.remove();
  }, [screen, router]);
  const navigate = (next: Screen) => {
    if (busyRef.current) return;
    setError("");
    setNotice("");
    setSecret(false);
    setScreen(next);
  };
  async function run(job: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await job();
    } catch (e) {
      if (mounted.current) {
        const code = e instanceof PilotError ? e.code : "unknown";
        setError((errorMessages[code] || errorMessages.unknown)![ar ? 0 : 1]!);
      }
    } finally {
      busyRef.current = false;
      if (mode === "live" && AppState.currentState !== "active") {
        gateway.current = null;
        setConnected(false);
      }
      if (mounted.current) setBusy(false);
    }
  }
  async function refreshArchive(id = router?.id) {
    if (id && journal.current) setIssues(await journal.current.list(id));
  }
  async function beginDemo() {
    await run(async () => {
      const demo = new DemoGateway();
      journal.current = new MemoryJournal();
      gateway.current = demo;
      setMode("demo");
      setRouter(demo.router);
      setConnected(true);
      setPlans((await demo.plans()).plans);
      setUnavailable([]);
      setIssues([]);
      setLookup("00123874");
      setSelectedIssue(null);
      setScreen("home");
    });
  }
  async function beginLive() {
    await run(async () => {
      if (!nativeAvailable()) throw new PilotError("unsupported");
      journal.current = await openJournal();
      setMode("live");
      gateway.current = null;
      setRouter(null);
      setConnected(false);
      setSaved(await journal.current.routers());
      setScreen("networks");
    });
  }
  async function connect() {
    await run(async () => {
      if (!connection.username.trim()) throw new PilotError("auth");
      const target = endpoint(connection.raw, connection.port, connection.portEdited);
      setConnection((v) => ({ ...v, raw: target.host, port: String(target.port), reveal: false }));
      const abort = new AbortController();
      controller.current = abort;
      try {
        const service = await connectLive(
          target,
          { user: connection.username, password: connection.password },
          (value: Endpoint) =>
            ask(
              t("اتصال غير مشفر", "Unencrypted connection"),
              t(
                "قد تنكشف بيانات الدخول على شبكة غير موثوقة. هل تثق بهذه الشبكة وتريد المتابعة إلى ",
                "An untrusted network can expose the login. Continue on this trusted network to ",
              ) +
                value.host +
                ":" +
                value.port +
                "?",
              t("متابعة على هذه الشبكة", "Continue on this network"),
              t("إلغاء", "Cancel"),
            ),
          abort.signal,
          router?.id,
        );
        const result = await service.plans();
        await journal.current!.saveRouter(service.router);
        gateway.current = service;
        setRouter(service.router);
        setPlans(result.plans);
        setUnavailable(result.unavailable);
        setSaved(await journal.current!.routers());
        setConnected(true);
        setReview(null);
        setIssueDraft(initialIssue);
        setCards([]);
        setSelectedCard(null);
        await refreshArchive(service.router.id);
        setConnection((v) => ({ ...v, password: "", username: "", reveal: false }));
        setScreen("home");
      } finally {
        controller.current = null;
      }
    });
  }
  async function inspect() {
    await run(async () => {
      if (!gateway.current) throw new PilotError("unreachable");
      const reading = await gateway.current.inspect(latin(lookup).trim());
      const matches = reading.cards;
      setCards(matches);
      if (reading.unavailable.length)
        setNotice(
          t(
            "تعذرت قراءة بعض المصادر؛ النتيجة لا تثبت غياب الكرت منها.",
            "Some sources could not be read; this does not establish absence there.",
          ),
        );
      setSelectedCard(null);
      if (matches.length === 1 && !reading.unavailable.length) {
        setSelectedCard(matches[0]!);
        setScreen("card");
      } else if (!matches.length)
        setNotice(
          t(
            "لم يظهر الرقم في المصادر المقروءة؛ هذا لا يثبت غيابه من خدمة تعذر قراءتها.",
            "No match appeared in readable sources; this does not establish absence from an unreadable service.",
          ),
        );
    });
  }
  async function prepare() {
    await run(async () => {
      const selected = plans.find((p) => planKey(p) === issueDraft.planKey);
      if (!selected || !router || selected.routerId !== router.id) throw new PilotError("identity");
      const bytes = selected.source === "hotspot" ? Number(issueDraft.mb) * 1e6 : selected.bytes,
        seconds =
          selected.source === "hotspot" ? Number(issueDraft.minutes) * 60 : selected.seconds;
      if (
        selected.source === "hotspot" &&
        ![bytes, seconds].every((n) => Number.isSafeInteger(n) && n! > 0)
      )
        throw new PilotError("unsupported");
      const random = Buffer.from(await Crypto.getRandomBytesAsync(16)).toString("hex");
      const name = issueDraft.manual ? latin(issueDraft.name).trim() : "M" + random.slice(0, 12);
      if (!/^[A-Za-z0-9_.@-]{4,32}$/.test(name)) throw new PilotError("address");
      setReview({
        id: Crypto.randomUUID(),
        routerId: router.id,
        plan: { ...selected },
        name,
        password: Buffer.from(await Crypto.getRandomBytesAsync(18)).toString("hex"),
        bytes,
        seconds,
        state: "prepared",
        demo: mode === "demo",
        createdAt: Date.now(),
      });
      setScreen("review");
    });
  }
  async function confirmIssue() {
    await run(async () => {
      if (!gateway.current || !journal.current || !review) throw new PilotError("unreachable");
      const result = await gateway.current.issue(review, journal.current);
      setSelectedIssue(result);
      setReview(null);
      setSecret(false);
      await refreshArchive();
      setScreen("result");
    });
  }
  async function verify(complete = false) {
    await run(async () => {
      if (!gateway.current || !journal.current || !selectedIssue)
        throw new PilotError("unreachable");
      if (
        complete &&
        !(await ask(
          t("استكمال نفس الكرت", "Complete the same voucher"),
          t(
            "نتحقق أولًا ثم نكمل إسناد الباقة وإتاحة هذا الحساب فقط، دون إضافة مستخدم آخر.",
            "Verify first, then complete plan assignment and enable this account only; no new user is added.",
          ),
          t("تحقق واستكمل", "Verify and complete"),
          t("إلغاء", "Cancel"),
        ))
      )
        return;
      const result = await gateway.current.verify(selectedIssue, journal.current, complete);
      setSelectedIssue(result);
      setSecret(false);
      await refreshArchive();
    });
  }
  async function output(kind: "print" | "pdf") {
    await run(async () => {
      if (!selectedIssue || !journal.current) throw new PilotError("unknown");
      let current = await journal.current.get(selectedIssue.id);
      if (!current || current.state !== "confirmed") throw new PilotError("unknown");
      if (gateway.current) {
        current = await gateway.current.verify(current, journal.current);
        setSelectedIssue(current);
        await refreshArchive();
        if (current.state !== "confirmed") throw new PilotError("unknown");
      }
      const warning = connected
        ? t(
            "ستظهر بيانات الدخول في الورقة أو الملف الذي تختاره. QR يتضمن رقم الكرت فقط.",
            "Login details will appear in your selected printout or file. QR contains the login number only.",
          )
        : t(
            "هذه بيانات إصدار محفوظة. لا يمكن التحقق من تغييرات خارج التطبيق دون اتصال. ستكشف بيانات الكرت في الورقة أو الملف.",
            "These are saved issuance details. External changes cannot be verified offline. The output will reveal voucher credentials.",
          );
      if (
        !(await ask(
          t("مراجعة قبل إخراج الكرت", "Review voucher output"),
          warning,
          t("متابعة", "Continue"),
          t("إلغاء", "Cancel"),
        ))
      )
        return;
      if (kind === "print") await printIssue(current, language);
      else await exportIssue(current, language);
      setNotice(
        t(
          "انتهت نافذة النظام؛ هذا لا يثبت خروج ورقة أو تسليم الملف.",
          "The system dialog finished; this does not prove a physical print or file delivery.",
        ),
      );
    });
  }
  const resumeRouter = (value: Router) =>
    run(async () => {
      gateway.current = null;
      setRouter(value);
      setConnected(false);
      setPlans([]);
      setCards([]);
      setSelectedCard(null);
      setSelectedIssue(null);
      setIssueDraft(initialIssue);
      await refreshArchive(value.id);
      setScreen("home");
    });
  const showConnect = () => {
    setConnection({
      ...initialConnection,
      raw: router?.endpoint.host || "",
      port: String(router?.endpoint.port || 8729),
      portEdited: router?.endpoint.explicitPort || false,
    });
    navigate("connect");
  };
  const currentAssessment = selectedCard ? assessment(selectedCard, language) : null;
  const hasPending = issues.some(
    (i) => !["confirmed", "rejected", "invalidated"].includes(i.state),
  );
  let content: React.ReactNode;
  if (!fonts && !fontError) content = <Txt>{t("نجهز الواجهة…", "Preparing the interface…")}</Txt>;
  else if (screen === "welcome")
    content = (
      <>
        <Txt title>{t("شبكتك، من جوالك.", "Your network, from your phone.")}</Txt>
        <Txt>
          {t(
            "نسخة اختبار محلية: ربط، فحص، إصدار كرت وطباعته.",
            "Local pilot: connect, inspect, issue one voucher and print it.",
          )}
        </Txt>
        <Button primary busy={busy} onPress={beginLive}>
          {t("ربط راوتر الاختبار", "Connect test router")}
        </Button>
        <Button disabled={busy} onPress={beginDemo}>
          {t("تجربة الواجهة ببيانات توضيحية", "Try with sample data")}
        </Button>
        <Notice>
          {t(
            "لا حساب سحابي ولا إرسال معلومات تلقائي. أدخل بيانات راوتر الاختبار داخل التطبيق فقط.",
            "No cloud account or automatic data upload. Enter test-router credentials only inside the app.",
          )}
        </Notice>
      </>
    );
  else if (screen === "networks")
    content = (
      <>
        <Txt title>{t("الشبكات المحفوظة", "Saved networks")}</Txt>
        <Button
          primary
          onPress={() => {
            setRouter(null);
            setConnection(initialConnection);
            navigate("connect");
          }}
        >
          {t("إضافة اتصال", "Add connection")}
        </Button>
        {saved.map((r) => (
          <Panel key={r.id}>
            <Txt>{r.name}</Txt>
            <Txt small latin>
              {r.endpoint.host + ":" + r.endpoint.port}
            </Txt>
            <Button onPress={() => resumeRouter(r)}>
              {t("فتح الأرشيف والبيانات المحفوظة", "Open archive and saved data")}
            </Button>
          </Panel>
        ))}
        {!saved.length ? (
          <Txt>{t("أضف راوتر الاختبار لتبدأ.", "Add your test router to start.")}</Txt>
        ) : null}
        <Button onPress={() => navigate("welcome")}>{t("رجوع للبداية", "Back to start")}</Button>
      </>
    );
  else if (screen === "connect")
    content = (
      <Connection
        draft={connection}
        setDraft={setConnection}
        connect={connect}
        busy={busy}
        cancel={() => controller.current?.abort()}
      />
    );
  else if (screen === "home")
    content = (
      <>
        <Txt title>{t("وش ننجز الآن؟", "What shall we do?")}</Txt>
        {!connected ? (
          <Notice>
            {t(
              "مساحة محفوظة؛ ليست قراءة حالية. أعد الربط للفحص أو الإصدار.",
              "Saved workspace, not a current reading. Reconnect to inspect or issue.",
            )}
          </Notice>
        ) : null}
        <Button primary disabled={!connected} onPress={() => navigate("lookup")}>
          {t("فحص كرت لزبون", "Inspect a customer voucher")}
        </Button>
        <Button primary disabled={!connected || hasPending} onPress={() => navigate("issue")}>
          {t("إصدار كرت واحد", "Issue one voucher")}
        </Button>
        <Button onPress={() => navigate("archive")}>
          {t("الأرشيف وإعادة الطباعة", "Archive and reprint")}
        </Button>
        {hasPending ? (
          <Notice danger>
            {t(
              "يوجد طلب غير محسوم. افتحه من الأرشيف وتحقق منه قبل إصدار جديد.",
              "A request is unresolved. Open it in the archive and verify before issuing again.",
            )}
          </Notice>
        ) : null}
        {mode === "live" ? (
          <Button onPress={showConnect}>{t("مراجعة الاتصال", "Review connection")}</Button>
        ) : null}
      </>
    );
  else if (screen === "lookup")
    content = (
      <>
        <Txt title>{t("فحص الكرت", "Inspect voucher")}</Txt>
        <Panel>
          <Field
            label={t("رقم الدخول على الكرت", "Voucher login number")}
            value={lookup}
            onChangeText={(v) => {
              setLookup(latin(v));
              setCards([]);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ writingDirection: "ltr" }}
          />
          <Button primary disabled={!connected} busy={busy} onPress={inspect}>
            {t("فحص", "Inspect")}
          </Button>
        </Panel>
        {cards.length > 1 ? (
          <Notice>
            {t(
              "الرقم موجود في أكثر من مصدر. قارن الباقة والقراءة؛ لا نختار نيابة عنك.",
              "This login exists in multiple sources. Compare the plan and reading; no source is selected for you.",
            )}
          </Notice>
        ) : null}
        {cards.map((c) => (
          <Panel key={c.source + c.id}>
            <Txt>
              {c.plan} · {c.source === "hotspot" ? "Hotspot" : "User Manager"}
            </Txt>
            <Txt small>{assessment(c, language).summary}</Txt>
            <Button
              onPress={() => {
                setSelectedCard(c);
                navigate("card");
              }}
            >
              {t("تفاصيل هذا الكرت", "View this voucher")}
            </Button>
          </Panel>
        ))}
        <Txt small>
          {t(
            "Hotspot: حسابات محلية في الراوتر. User Manager: إدارة مستخدمين عبر RADIUS وقد تخدم نفس صفحة الدخول.",
            "Hotspot stores local router accounts. User Manager manages accounts through RADIUS and may serve the same login page.",
          )}
        </Txt>
      </>
    );
  else if (screen === "card" && selectedCard && currentAssessment)
    content = (
      <>
        <Button onPress={() => navigate("lookup")}>
          {t("رجوع لنتائج الفحص", "Back to lookup results")}
        </Button>
        <Txt title>{selectedCard.name}</Txt>
        <Panel>
          <Txt>{currentAssessment.summary}</Txt>
          <Fact
            label={t("المصدر والباقة", "Source and plan")}
            value={selectedCard.source + " · " + selectedCard.plan}
          />
          <Fact
            label={t("المستخدم / الحد", "Used / limit")}
            value={dataLabel(selectedCard.usedBytes) + " / " + dataLabel(selectedCard.limitBytes)}
          />
          <Fact label={t("المتبقي", "Remaining")} value={dataLabel(currentAssessment.remaining)} />
          <Fact
            label={t("وقت الاستخدام / الحد بالدقائق", "Online minutes used / limit")}
            value={
              (selectedCard.usedSeconds === null
                ? "—"
                : (selectedCard.usedSeconds / 60).toFixed(1)) +
              " / " +
              (selectedCard.limitSeconds === null ? "—" : selectedCard.limitSeconds / 60)
            }
          />
          <Fact
            label={t("وقت القراءة", "Reading time")}
            value={new Date(selectedCard.readAt).toLocaleTimeString("en-GB")}
          />
        </Panel>
        <Notice>
          {t(
            "السجل لا يحدد التطبيق أو الشخص الذي استهلك البيانات. القيم غير المتاحة ليست صفرًا.",
            "This record does not identify which app or person used data. Unavailable values are not zero.",
          )}
        </Notice>
      </>
    );
  else if (screen === "plans")
    content = (
      <>
        <Txt title>{t("باقات هذا الراوتر", "This router’s plans")}</Txt>
        {plans.map((p) => (
          <Panel key={planKey(p)}>
            <Txt>{p.name}</Txt>
            <Fact
              label={t("مكان الحساب", "Account source")}
              value={p.source === "hotspot" ? "Hotspot" : "User Manager"}
            />
            <Fact label={t("الحجم", "Data")} value={dataLabel(p.bytes)} />
            <Txt small>
              {p.supported
                ? t(
                    "متاحة للتجربة بحسب القيم المقروءة.",
                    "Available for the pilot with the values read.",
                  )
                : t(
                    "تعريف مركب غير مدعوم للإصدار في التجربة.",
                    "Complex definition not supported for issuance in this pilot.",
                  )}
            </Txt>
          </Panel>
        ))}
        {!plans.length ? (
          <Txt>{t("لا باقات مقروءة في هذه الجلسة.", "No plans read in this session.")}</Txt>
        ) : null}
        {unavailable.length ? (
          <Notice>
            {t("مصادر تعذرت قراءتها: ", "Unreadable sources: ") +
              unavailable.join(", ") +
              t(
                "؛ قد تكون غير مثبتة أو الصلاحية غير كافية.",
                "; they may be absent or permissions insufficient.",
              )}
          </Notice>
        ) : null}
      </>
    );
  else if (screen === "issue")
    content = (
      <IssueForm
        plans={plans}
        draft={issueDraft}
        setDraft={setIssueDraft}
        prepare={prepare}
        busy={busy}
      />
    );
  else if (screen === "review" && review)
    content = (
      <IssueReview
        issue={review}
        confirm={confirmIssue}
        back={() => navigate("issue")}
        busy={busy}
      />
    );
  else if (screen === "archive")
    content = (
      <>
        <Txt title>{t("أرشيف هذه الشبكة", "This network’s archive")}</Txt>
        {issues.map((i) => (
          <Panel key={i.id}>
            <Txt latin>{i.name}</Txt>
            <Txt>{stateLabel(i.state, ar)}</Txt>
            <Txt small>
              {i.plan.name} · {new Date(i.createdAt).toLocaleString("en-GB")}
            </Txt>
            <Button
              onPress={() => {
                setSelectedIssue(i);
                setSecret(false);
                navigate("result");
              }}
            >
              {t("فتح السجل", "Open record")}
            </Button>
          </Panel>
        ))}
        {!issues.length ? (
          <Txt>{t("لم تصدر كروتًا هنا بعد.", "No vouchers issued here yet.")}</Txt>
        ) : null}
        <Notice>
          {mode === "demo"
            ? t("أرشيف توضيحي في الذاكرة فقط.", "Demo archive in memory only.")
            : t(
                "بيانات الإصدار محفوظة مشفرة على هذا الهاتف. بيانات دخول الراوتر ليست محفوظة.",
                "Issuance data is encrypted on this phone. Router login details are not stored.",
              )}
        </Notice>
      </>
    );
  else if (screen === "result" && selectedIssue)
    content = (
      <>
        <Txt title>{stateLabel(selectedIssue.state, ar)}</Txt>
        <Panel>
          <Txt latin>{selectedIssue.name}</Txt>
          <Fact label={t("الباقة", "Plan")} value={selectedIssue.plan.name} />
          <Fact label={t("مرجع الإصدار", "Issue reference")} value={selectedIssue.id} />
        </Panel>
        {selectedIssue.state === "confirmed" ? (
          <>
            <Button onPress={() => setSecret(!secret)}>
              {secret
                ? t("إخفاء كلمة المرور", "Hide password")
                : t("إظهار كلمة مرور هذا الكرت", "Show this voucher’s password")}
            </Button>
            {secret ? (
              <Panel>
                <Txt latin>{selectedIssue.password}</Txt>
              </Panel>
            ) : null}
            {Platform.OS === "web" ? (
              <Notice>
                {t(
                  "الطباعة وPDF متاحان في نسخة الهاتف الأصلية؛ هذه المعاينة لفحص الواجهة فقط.",
                  "Printing and PDF require the native phone app; this preview is for interface testing.",
                )}
              </Notice>
            ) : null}
            <Button
              primary
              disabled={Platform.OS === "web"}
              busy={busy}
              onPress={() => output("print")}
            >
              {t("طباعة نفس الكرت", "Print this voucher")}
            </Button>
            <Button disabled={busy || Platform.OS === "web"} onPress={() => output("pdf")}>
              {t("تصدير PDF أو مشاركته", "Export or share PDF")}
            </Button>
            <Txt small>
              {t("إعادة الطباعة لا تصدر كرتًا جديدًا.", "Reprinting does not issue a new voucher.")}
            </Txt>
          </>
        ) : (
          <>
            <Notice danger>
              {selectedIssue.state === "invalidated"
                ? t(
                    "قراءة الاعتماد لا تطابق الإصدار المحفوظ؛ لا نعرض بيانات غير متحققة للطباعة.",
                    "The credential reading does not match the saved issue; unverified handover data is not shown.",
                  )
                : t(
                    "لا نسلّم الكرت قبل إثبات إسناد الباقة والحقوق. التحقق لا يعيد إنشاء المستخدم.",
                    "No handover before plan assignment and rights are verified. Verification never adds the user again.",
                  )}
            </Notice>
            {selectedIssue.reason ? (
              <Txt small>
                {selectedIssue.reason === "profile"
                  ? t(
                      "تغير تعريف الباقة بعد تجهيز الطلب؛ راجع إعدادها مع المهندس قبل تسليم الكرت.",
                      "The plan definition changed after preparation; review its configuration before handover.",
                    )
                  : selectedIssue.reason === "limits"
                    ? t(
                        "حدود الحساب لا تطابق الطلب. لم نعدّلها تلقائيًا؛ راجع الحساب على راوتر الاختبار.",
                        "Account limits do not match the request. They were not changed automatically; review the account on the test router.",
                      )
                    : selectedIssue.reason === "association"
                      ? t(
                          "لم يكتمل إثبات ربط الحساب بالباقة. يمكنك التحقق واستكمال نفس الحساب، دون إنشاء حساب آخر.",
                          "Plan assignment is not fully verified. Verify and complete this same account without creating another.",
                        )
                      : selectedIssue.reason === "not-found"
                        ? t(
                            "لم نعثر على الحساب في القراءة الأخيرة. لا نعيد إنشاءه تلقائيًا؛ راجع الطلب على الراوتر.",
                            "The account was absent in the latest reading. It is not recreated automatically; review the request on the router.",
                          )
                        : t(
                            "صلاحيات القراءة لا تكفي لإثبات بيانات تسليم هذا الكرت؛ اطلب من المهندس مراجعتها.",
                            "Read permissions did not establish this voucher’s handover details; ask your engineer to review them.",
                          )}
              </Txt>
            ) : null}
            <Button
              disabled={
                !connected ||
                busy ||
                selectedIssue.state === "rejected" ||
                selectedIssue.state === "invalidated"
              }
              onPress={() => verify()}
            >
              {t("التحقق من نفس الطلب", "Verify this same request")}
            </Button>
            {selectedIssue.state === "partial" &&
            selectedIssue.plan.source !== "hotspot" &&
            selectedIssue.reason !== "profile" ? (
              <Button disabled={!connected || busy} onPress={() => verify(true)}>
                {t("تحقق واستكمل ربط الباقة لهذا الكرت", "Verify and complete this voucher’s plan")}
              </Button>
            ) : null}
          </>
        )}
        <Button disabled={busy} onPress={() => navigate("archive")}>
          {t("رجوع للأرشيف", "Back to archive")}
        </Button>
      </>
    );
  else
    content = (
      <>
        <Txt title>{t("إعدادات التجربة", "Pilot settings")}</Txt>
        <Button onPress={() => setLanguage(ar ? "en" : "ar")}>{ar ? "English" : "العربية"}</Button>
        {mode === "demo" ? (
          <Panel>
            <Txt>{t("اختبار نتيجة الإصدار", "Test issuance outcome")}</Txt>
            {(["confirmed", "rejected", "unknown"] as const).map((value) => (
              <Button
                key={value}
                onPress={() => {
                  (gateway.current as DemoGateway).outcome = value;
                  setNotice(stateLabel(value, ar));
                }}
              >
                {stateLabel(value, ar)}
              </Button>
            ))}
          </Panel>
        ) : null}
        <Button
          onPress={() => {
            gateway.current = null;
            setConnected(false);
            setConnection(initialConnection);
            setRouter(null);
            setCards([]);
            setSelectedIssue(null);
            setScreen("welcome");
          }}
        >
          {t("إنهاء الجلسة والرجوع للبداية", "End session and return to start")}
        </Button>
        <Txt small>
          {t(
            "هذا الإصدار للتجربة: إدارة الباقات والتجديد والاستكشاف الكامل ليست ضمن الرحلة الأولى.",
            "This is a pilot: editing plans, renewal, and full discovery are outside this first journey.",
          )}
        </Txt>
      </>
    );
  const workspace = !!router && !["welcome", "networks", "connect"].includes(screen);
  const active =
    screen === "card"
      ? "lookup"
      : ["issue", "review"].includes(screen)
        ? "home"
        : screen === "result"
          ? "archive"
          : screen;
  return (
    <SafeAreaProvider>
      <Locale.Provider value={language}>
        <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
          <StatusBar style="light" />
          <View style={[s.header, { flexDirection: ar ? "row-reverse" : "row" }]}>
            <View style={{ flex: 1 }}>
              <Txt>
                Mikro
                <TextDot />
              </Txt>
              {router && workspace ? (
                <Txt small>
                  {router.name +
                    " · " +
                    (mode === "demo"
                      ? t("توضيحي", "Demo")
                      : connected
                        ? t("آخر ربط ناجح", "Last connection succeeded")
                        : t("محفوظ", "Saved"))}
                </Txt>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("تبديل اللغة", "Change language")}
              disabled={busy}
              onPress={() => setLanguage(ar ? "en" : "ar")}
              style={s.language}
            >
              <Txt small>{ar ? "EN" : "عربي"}</Txt>
            </Pressable>
            {workspace && mode === "live" ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    gateway.current = null;
                    setConnected(false);
                    setRouter(null);
                    setSaved(await journal.current!.routers());
                    setScreen("networks");
                  })
                }
                style={s.language}
              >
                <Txt small>{t("الشبكات", "Networks")}</Txt>
              </Pressable>
            ) : null}
          </View>
          {mode === "demo" && screen !== "welcome" ? (
            <View style={s.demo}>
              <Txt small color={colors.background}>
                {t(
                  "بيانات توضيحية · لا أوامر على راوتر حقيقي",
                  "Sample data · no real router commands",
                )}
              </Txt>
            </View>
          ) : null}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
              key={screen}
            >
              {error ? <Notice danger>{error}</Notice> : null}
              {notice ? <Notice>{notice}</Notice> : null}
              {content}
              {busy ? (
                <Txt small>
                  {t(
                    "جارٍ التحقق… لا تغلق التطبيق أثناء كتابة كرت.",
                    "Verifying… keep the app open during voucher issuance.",
                  )}
                </Txt>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
          {workspace ? (
            <View style={[s.nav, { flexDirection: ar ? "row-reverse" : "row" }]}>
              {tabs.map(({ screen: page, ar: label, en, Icon }) => (
                <Pressable
                  key={page}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active === page, disabled: busy }}
                  accessibilityLabel={ar ? label : en}
                  disabled={busy}
                  onPress={() => navigate(page)}
                  style={[s.tab, active === page && s.active]}
                >
                  <Icon size={28} color={active === page ? colors.primary : colors.muted} />
                  <Txt small color={active === page ? colors.primary : colors.muted}>
                    {ar ? label : en}
                  </Txt>
                </Pressable>
              ))}
            </View>
          ) : null}
        </SafeAreaView>
      </Locale.Provider>
    </SafeAreaProvider>
  );
}
function TextDot() {
  return <Txt color={colors.primary}>.</Txt>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    gap: 9,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  language: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },
  content: {
    padding: 19,
    paddingBottom: 32,
    gap: 17,
    width: "100%",
    maxWidth: 650,
    alignSelf: "center",
  },
  demo: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 5 },
  nav: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 5,
    gap: 2,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    minHeight: 82,
    paddingHorizontal: 2,
    paddingVertical: 7,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  active: { backgroundColor: colors.surface },
});
