export function voucherCommands(
  source: string,
  version: string,
  name: string,
  password: string,
  profile: string,
  marker: string,
  bytes: number,
  time: number,
  indexed = false,
) {
  for (const v of [name, password, profile, marker])
    if (!/^[\w.@-]*$/.test(v)) throw Error("unsafe_value");
  if (![bytes, time].every((n) => Number.isSafeInteger(n) && n >= 0)) throw Error("unsafe_value");
  const hs = source === "hotspot",
    v6 = version.startsWith("6");
  const base = hs ? "/ip hotspot user" : v6 ? "/tool user-manager user" : "/user-manager user";
  const field = hs || !v6 ? "name" : "username";
  const add = hs
    ? `${base} add name="${name}" password="${password}" profile="${profile}" limit-bytes-total=${bytes} limit-uptime=${time}s comment="${marker}"`
    : v6
      ? `:local cs [/tool user-manager customer find]; :if ([:len $cs] != 1) do={:error "customer_ambiguous"}; :local c [/tool user-manager customer get [:pick $cs 0] login]; ${base} add username="${name}" password="${password}" customer=$c comment="${marker}" disabled=yes`
      : `${base} add name="${name}" password="${password}" comment="${marker}" disabled=yes`;
  const assign = hs
    ? ""
    : v6
      ? `:if ([${base} get $u actual-profile] != "${profile}") do={${base} create-and-activate-profile $u customer=[${base} get $u customer] profile="${profile}"}; :if ([${base} get $u actual-profile] != "${profile}") do={:error "profile_not_assigned"}`
      : `:if ([:len [/user-manager user-profile find user="${name}" profile="${profile}"]] = 0) do={/user-manager user-profile add user="${name}" profile="${profile}"}; :if ([:len [/user-manager user-profile find user="${name}" profile="${profile}"]] != 1) do={:error "profile_not_assigned"}`;
  const receipt = `mikro-issued-${marker}`;
  const lookup = indexed ? `($users->"${source}:${name}")` : `[${base} find ${field}="${name}"]`;
  const receiptLookup = indexed ? `($receipts->"${receipt}")` : `[/system script find name="${receipt}"]`;
  const receiptValue = indexed ? '$receipt' : '[/system script get $receipt source]';
  return `:local u ${lookup}; :local receipt ${receiptLookup}; :if ([:len [:tostr $u]] > 0) do={:if ([:len [:tostr $receipt]] = 0) do={:error "exists"}; :if (${receiptValue} != [:tostr $u]) do={:error "exists"}; :if ([${base} get $u password] != "${password}") do={:error "credentials_changed"}} else={:if ([:len [:tostr $receipt]] > 0) do={:error "previous_account_removed"}; ${add}; :set u [${base} find ${field}="${name}"]; /system script add name="${receipt}" source=[:tostr $u] comment="Mikro issuance receipt"; ${indexed ? `:set ($users->"${source}:${name}") [:tostr $u]; :set ($receipts->"${receipt}") [:tostr $u];` : ''}}; ${assign}; ${base} set $u disabled=no`;
}

export function voucherIndexes(source: string, version: string) {
  const base = source === 'hotspot' ? '/ip hotspot user' : version.startsWith('6') ? '/tool user-manager user' : '/user-manager user';
  const field = source === 'usermanager' && version.startsWith('6') ? 'username' : 'name';
  return `:local users [:toarray ""]; :local receipts [:toarray ""]; :foreach r in=[${base} print as-value] do={:set ($users->("${source}:" . ($r->"${field}"))) ($r->".id")}; :foreach r in=[/system script print as-value where name~"^mikro-issued-"] do={:set ($receipts->($r->"name")) ($r->"source")}`;
}

export type VoucherTask = { id: string; source: string; name: string; password: string; profile: string; bytes: number; time: number };
export function voucherChunkScript(tasks: VoucherTask[], version: string, lease: string, token: string, resultUrl: string) {
  if (!tasks.length || tasks.length > 100 || !/^[a-f0-9-]{36}$/.test(lease) || !/^[a-f0-9]{48}$/.test(token)) throw Error('invalid_chunk');
  if (tasks.some(t=>t.source !== tasks[0]?.source || !/^[a-f0-9-]{36}$/.test(t.id))) throw Error('invalid_chunk');
  return [voucherIndexes(tasks[0]?.source ?? '', version), ':local results ""',
    ...tasks.map(t=>`:if ([/system resource get cpu-load] >= 80) do={:delay 1s}; :local res "ok"; :do {${voucherCommands(t.source,version,t.name,t.password,t.profile,'vc-'+t.id,t.bytes,t.time,true)}} on-error={:set res "error"}; :if ([:len $results]>0) do={:set results ($results . ",")}; :set results ($results . "{\"item\":\"${t.id}\",\"result\":\"" . $res . "\"}"); :delay 10ms`),
    `/tool fetch url="${resultUrl}" check-certificate=yes http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ${token}" http-data=("{\"lease\":\"${lease}\",\"results\":[" . $results . "]}") output=none`,
  ].join('; ');
}
export function voucherDispatcher(token: string, url: string, chained = false) {
  const expr = (source: string, version: string) => {
    let cmd = voucherCommands(source, version, "NAME", "PASSWORD", "PROFILE", "MARKER", 0, 0);
    cmd = cmd
      .replace("limit-bytes-total=0", "limit-bytes-total=BYTES")
      .replace("limit-uptime=0s", "limit-uptime=TIMEs");
    let quoted = '"' + cmd.replace(/\\/g, "\\").replace(/"/g, '\\"').replace(/\$/g, "\\$") + '"';
    for (const [needle, v] of [
      ["NAME", "vn"],
      ["PASSWORD", "vp"],
      ["PROFILE", "vf"],
      ["MARKER", "vm"],
      ["BYTES", "vb"],
      ["TIME", "vt"],
    ])
      quoted = quoted.split(needle ?? "").join('" . $' + v + ' . "');
    return "(" + quoted + ")";
  };
  const fields = ["vs", "vn", "vp", "vf", "vm", "vb", "vt"];
  const parse = fields
    .map((f, i) =>
      i === fields.length - 1
        ? `:local ${f} $r`
        : `:set i [:find $r "|"]; :local ${f} [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]`,
    )
    .join("; ");
  return (
    String.raw`:if ([:pick $job 0 6] = "issue|") do={:local r [:pick $job 6 [:len $job]]; :local i [:find $r "|"]; :local jid [:pick $r 0 $i]; :set r [:pick $r ($i + 1) [:len $r]]; ` +
    parse +
    String.raw`; :if ($vp = "-") do={:set vp ""}; :local vr "ok"; :do {:local code ""; :if ($vs = "hotspot") do={:set code ` +
    expr("hotspot", "7") +
    String.raw`}; :if ($vs = "usermanager") do={:if ([:pick $ver 0 1] = "6") do={:set code ` +
    expr("usermanager", "6") +
    String.raw`} else={:set code ` +
    expr("usermanager", "7") +
    String.raw`}}; :if ([:len $code] = 0) do={:error "source"}; :local f [:parse $code]; $f} on-error={:set vr "error"}; :do {/tool fetch url="` +
    url.replace("router-report", "voucher-result") +
    String.raw`" check-certificate=yes http-method=post http-header-field="Content-Type: application/json,X-Mikro-Token: ` +
    token +
    String.raw`" http-data=("{\"item\":\"" . $jid . "\",\"result\":\"" . $vr . "\"}") output=none} on-error={:return}` +
    (chained ? '; :delay 500ms; :set job ""' : "") + "}"
  );
}

export function voucherWorker(token: string, url: string) {
  return [
    ':if ([:len [/system script job find where script="mikro-issue"]] > 1) do={:return}',
    ':local started [/system resource get uptime]',
    ':for tick from=1 to=4 do={',
    ':if (([/system resource get uptime] - $started) > 20s) do={:return}',
    ':if ([/system resource get cpu-load] >= 80) do={:return}',
    ':if ([/system resource get free-memory] < 16777216) do={:return}',
    ':if ([/system resource get free-hdd-space] < 4194304) do={:return}',
    `:do {/tool fetch url="${url.replace("router-report", "voucher-next")}" check-certificate=yes http-method=post http-header-field="X-Mikro-Token: ${token}" dst-path="mikro-chunk.rsc"} on-error={:return}`,
    ':do {/import file-name=mikro-chunk.rsc} on-error={/file remove [find name="mikro-chunk.rsc"]; :return}',
    '/file remove [find name="mikro-chunk.rsc"]', ':delay 200ms', '}',
  ].join('; ');
}
