import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ageFromDob(dob?: string | null) {
  if (!dob) return null;
  const birth = new Date(dob + "T00:00:00Z");
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function ageBand(dob?: string | null) {
  const age = ageFromDob(dob);
  if (age === null) return "Under 18";
  if (age < 13) return "Under 13";
  if (age <= 15) return "13–15";
  if (age <= 17) return "16–17";
  return "18+";
}

function countryName(code?: string | null) {
  const normalized = String(code || "").toUpperCase();
  if (!normalized) return "Not shown";
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function requestContext(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const tokenHash = await hashToken(token);

  const { data: request } = await admin
    .from("guardian_consent_requests")
    .select("child_user_id,status,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!request) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name,date_of_birth,country_code")
    .eq("id", request.child_user_id)
    .maybeSingle();

  const firstName = String(profile?.full_name || "").trim().split(/\s+/)[0] || "Young person";
  const expired =
    request.status === "pending" &&
    request.expires_at &&
    new Date(request.expires_at).getTime() <= Date.now();

  return {
    firstName,
    ageBand: ageBand(profile?.date_of_birth),
    region: countryName(profile?.country_code),
    status: expired ? "expired" : request.status,
  };
}

type PageContext = {
  firstName?: string;
  ageBand?: string;
  region?: string;
  status?: string;
};

function page({
  token,
  message = "",
  status = "",
  context = null,
}: {
  token: string;
  message?: string;
  status?: string;
  context?: PageContext | null;
}) {
  const safeToken = token.replace(/[^a-f0-9]/gi, "");
  const resolvedStatus = status || context?.status || "";
  const done = resolvedStatus === "approved" || resolvedStatus === "rejected" || resolvedStatus === "expired";
  const title =
    resolvedStatus === "approved"
      ? "Approval complete"
      : resolvedStatus === "rejected"
        ? "Request declined"
        : resolvedStatus === "expired"
          ? "Link expired"
          : "Guardian approval";
  const body =
    resolvedStatus === "approved"
      ? "Thank you. The StudentHood account can continue once the app refreshes."
      : resolvedStatus === "rejected"
        ? "The request was declined. The StudentHood account will remain paused."
        : resolvedStatus === "expired"
          ? "This approval link has expired. Ask the young person to create a new request."
          : "Review the account information and StudentHood safety protections before deciding.";

  const firstName = escapeHtml(context?.firstName || "Young person");
  const band = escapeHtml(context?.ageBand || "Under 18");
  const region = escapeHtml(context?.region || "Not shown");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>StudentHood Guardian Approval</title>
<style>
:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b0d0f;color:#fff;min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(600px,100%);background:#15191d;border:1px solid #30363d;border-radius:28px;padding:28px}.brand{font-weight:900;font-size:22px}.kicker{margin-top:26px;color:#ff715b;font-size:12px;font-weight:900;letter-spacing:.16em}.title{font-size:38px;line-height:1.05;margin:10px 0 12px}.copy{color:#b7bec7;line-height:1.6}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.summaryItem{background:#101417;border:1px solid #30363d;border-radius:16px;padding:13px}.summaryLabel{font-size:10px;font-weight:800;color:#8c96a1;text-transform:uppercase;letter-spacing:.08em}.summaryValue{margin-top:5px;font-size:14px;font-weight:800}.section{margin-top:18px;padding:16px;border-radius:18px;background:#1d2329;border:1px solid #30363d}.section h2{font-size:15px;margin:0 0 10px}.section p{margin:0;color:#cbd2da;font-size:13px;line-height:1.55}.protections{display:grid;gap:10px;margin-top:12px}.protection{display:flex;gap:10px;color:#cbd2da;font-size:13px;line-height:1.5}.dot{width:7px;height:7px;border-radius:50%;background:#ff715b;margin-top:7px;flex:none}.privacy{margin-top:12px;color:#8c96a1;font-size:11px;line-height:1.5}.field{margin-top:14px}label{display:block;font-size:12px;font-weight:800;margin-bottom:7px}input,select{width:100%;height:50px;border-radius:14px;border:1px solid #3a424b;background:#0f1316;color:#fff;padding:0 14px;font-size:15px}.check{display:flex;gap:10px;align-items:flex-start;margin-top:16px;color:#cbd2da;font-size:13px;line-height:1.45}.check input{width:18px;height:18px;margin-top:1px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}button{height:50px;border:0;border-radius:14px;font-weight:900;font-size:14px;cursor:pointer}.approve{background:#ff5d4f;color:#fff}.reject{background:#252b31;color:#fff;border:1px solid #3a424b}.msg{margin-top:14px;color:#ff9d8d;font-size:13px}.fine{margin-top:18px;color:#8c96a1;font-size:11px;line-height:1.5}@media(max-width:520px){.title{font-size:32px}.actions,.summary{grid-template-columns:1fr}.summary{gap:8px}}
</style>
</head>
<body>
<main class="card">
<div class="brand">StudentHood</div>
<div class="kicker">GUARDIAN APPROVAL</div>
<h1 class="title">${title}</h1>
<p class="copy">${body}</p>
${message ? `<div class="msg">${escapeHtml(message)}</div>` : ""}
${done ? "" : `
<div class="summary">
  <div class="summaryItem"><div class="summaryLabel">Young person</div><div class="summaryValue">${firstName}</div></div>
  <div class="summaryItem"><div class="summaryLabel">Age group</div><div class="summaryValue">${band}</div></div>
  <div class="summaryItem"><div class="summaryLabel">Region</div><div class="summaryValue">${region}</div></div>
</div>

<div class="section">
  <h2>Why your approval is needed</h2>
  <p>Based on the age and region saved for this account, StudentHood requires parent or legal guardian consent before the account can be activated.</p>
</div>

<div class="section">
  <h2>What StudentHood protects</h2>
  <div class="protections">
    <div class="protection"><span class="dot"></span><span><strong>Private by default:</strong> youth accounts start with stronger privacy settings.</span></div>
    <div class="protection"><span class="dot"></span><span><strong>Safer messaging:</strong> the young person can only receive Pings from approved mutual connections called Peeps, helping prevent unsolicited messages from strangers.</span></div>
    <div class="protection"><span class="dot"></span><span><strong>Location protection:</strong> precise location is not exposed and youth discovery is limited to safer regional contexts such as campus or city.</span></div>
    <div class="protection"><span class="dot"></span><span><strong>Age-appropriate experience:</strong> adult or explicit content is restricted and recommendations use youth-safe rules.</span></div>
    <div class="protection"><span class="dot"></span><span><strong>Quiet hours:</strong> under-18 accounts pause between 7:00 PM and 7:00 AM using the account's saved local safety time.</span></div>
  </div>
  <div class="privacy">For privacy, this approval page does not show the young person's full date of birth, email address, school or campus, city, messages, Scenes, or precise location.</div>
</div>

<div class="section">
  <h2>Your decision</h2>
  <p>Only continue if you are the young person's parent or legal guardian and you understand the protections above.</p>
  <form method="post">
    <input type="hidden" name="token" value="${safeToken}"/>
    <div class="field"><label for="guardian_name">Your full name</label><input id="guardian_name" name="guardian_name" required maxlength="100"/></div>
    <div class="field"><label for="relationship">Relationship</label><select id="relationship" name="relationship" required><option value="parent">Parent</option><option value="legal_guardian">Legal guardian</option></select></div>
    <label class="check"><input type="checkbox" name="attest" value="yes" required/><span>I confirm that I am the parent or legal guardian and I consent to this young person using StudentHood subject to the safety controls described above.</span></label>
    <div class="actions">
      <button class="approve" type="submit" name="decision" value="approve">Approve account</button>
      <button class="reject" type="submit" name="decision" value="reject">Decline</button>
    </div>
  </form>
</div>`}
<p class="fine">Test flow: this link confirms guardian consent for development testing. Production launch still requires the final guardian identity/age-assurance method and legal review for each launch market.</p>
</main>
</body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const urlToken = (url.searchParams.get("token") || "").trim();

  if (req.method === "GET") {
    if (!/^[a-f0-9]{64}$/i.test(urlToken)) {
      return new Response(page({ token: "", message: "This approval link is invalid." }), {
        status: 400,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const context = await requestContext(urlToken);
    if (!context) {
      return new Response(page({ token: "", message: "This approval link is invalid." }), {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response(page({ token: urlToken, context }), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const form = await req.formData();
  const token = String(form.get("token") || "").trim();
  const guardianName = String(form.get("guardian_name") || "").trim();
  const relationship = String(form.get("relationship") || "").trim();
  const decision = String(form.get("decision") || "").trim();
  const attest = String(form.get("attest") || "");

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return new Response(page({ token: "", message: "This approval link is invalid." }), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const context = await requestContext(token);

  if (decision === "approve" && attest !== "yes") {
    return new Response(page({ token, context, message: "Please confirm that you are the parent or legal guardian." }), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const { data, error } = await admin.rpc("studenthood_decide_guardian_consent", {
    p_token: token,
    p_guardian_name: guardianName,
    p_relationship: relationship,
    p_decision: decision,
  });

  if (error) {
    return new Response(page({ token, context, message: error.message }), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const status = String(data?.status || "rejected");
  return new Response(page({ token, status, context: { ...context, status } }), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});