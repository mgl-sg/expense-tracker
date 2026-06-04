/**
 * Vercel serverless function — scans Gmail for expense emails
 * and uses Claude to extract transaction data.
 *
 * Requires these environment variables in Vercel:
 *   ANTHROPIC_API_KEY   — your Anthropic key
 *   GMAIL_CLIENT_ID     — Google OAuth client ID
 *   GMAIL_CLIENT_SECRET — Google OAuth client secret
 *   GMAIL_REFRESH_TOKEN — your refresh token (one-time setup)
 */

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token: " + JSON.stringify(data));
  return data.access_token;
}

async function gmailFetch(path, token) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

function decodeBody(msg) {
  // Try plain text first, then HTML
  const parts = msg.payload?.parts || [];
  const tryPart = (mimeType) => {
    const part = parts.find(p => p.mimeType === mimeType);
    if (part?.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf-8");
    return null;
  };
  if (msg.payload?.body?.data) return Buffer.from(msg.payload.body.data, "base64url").toString("utf-8");
  return tryPart("text/plain") || tryPart("text/html") || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  if (!process.env.GMAIL_CLIENT_ID) return res.status(500).json({ error: "Gmail credentials not configured" });

  try {
    // 1. Get Gmail access token
    const token = await getAccessToken();

    // 2. Search Gmail for bank/transaction emails from last 30 days
    const query = encodeURIComponent(
      "newer_than:30d (DBS OR UOB OR OCBC OR Grab OR PayLah OR PayNow OR Shopee OR Lazada OR receipt OR transaction OR debit OR credit OR payment) -category:promotions -category:social"
    );
    const list = await gmailFetch(`messages?maxResults=40&q=${query}`, token);
    const messages = list.messages || [];

    if (messages.length === 0) {
      return res.status(200).json({ expenses: [], count: 0 });
    }

    // 3. Fetch each email body
    const emails = [];
    for (const { id } of messages.slice(0, 30)) {
      try {
        const msg = await gmailFetch(`messages/${id}?format=full`, token);
        const subject = msg.payload?.headers?.find(h => h.name === "Subject")?.value || "";
        const from    = msg.payload?.headers?.find(h => h.name === "From")?.value || "";
        const body    = decodeBody(msg).slice(0, 1500); // truncate for token limit
        emails.push({ id, subject, from, body });
      } catch {}
    }

    // 4. Ask Claude to extract expenses from all emails in one call
    const prompt = `You are extracting expense transactions from Singapore bank/payment emails.

For each email below, extract any expense transaction. Skip promotions, newsletters, OTPs, login alerts, and balance summaries.

Return ONLY a JSON array (no markdown) of objects with:
{ "emailId": string, "merchant": string, "amount": number, "date": "YYYY-MM-DD", "category": one of ["Food & Dining","Public Transport","PHV / Taxi","Shopping","Groceries","Entertainment","Healthcare","Utilities","Annual","Business","Others"], "payment": string, "note": string }

Emails:
${emails.map((e, i) => `--- Email ${i + 1} (id: ${e.id}) ---\nFrom: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}`).join("\n\n")}

Return [] if no valid transactions found. JSON only, no explanation.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.find(b => b.type === "text")?.text || "[]";
    const expenses = JSON.parse(text.replace(/```json|```/g, "").trim());

    return res.status(200).json({ expenses, count: expenses.length });

  } catch (err) {
    console.error("Scan error:", err);
    return res.status(500).json({ error: err.message });
  }
}
