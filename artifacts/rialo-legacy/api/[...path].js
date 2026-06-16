import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  if (!url || !serviceKey) throw new Error("Missing Supabase credentials");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function walletCredentials(addr) {
  const normal = addr.toLowerCase();
  return {
    email: `w${normal.slice(2)}@wallet.arkive.app`,
    password: `wk_${normal.slice(2)}`,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const path = (req.url ?? "").replace(/\?.*$/, "");

  if (req.method === "GET" && path.endsWith("/healthz")) {
    res.json({ ok: true });
    return;
  }

  if (req.method === "POST" && path.endsWith("/wallet/signup")) {
    const { address, email } = req.body ?? {};
    if (!address) { res.status(400).json({ error: "Missing address" }); return; }
    try {
      const admin = getAdminClient();
      const normal = address.toLowerCase();
      const { email: walletEmail, password: walletPassword } = walletCredentials(normal);
      const { error } = await admin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true,
        user_metadata: {
          wallet_address: normal,
          display_name: `${address.slice(0, 6)}…${address.slice(-4)}`,
          ...(email ? { contact_email: email } : {}),
        },
      });
      if (error && !error.message.toLowerCase().includes("already")) throw error;
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: msg });
    }
    return;
  }

  if (req.method === "POST" && path.endsWith("/wallet/linked-signin")) {
    const { address } = req.body ?? {};
    if (!address) { res.status(400).json({ error: "Missing address" }); return; }
    try {
      const admin = getAdminClient();
      const normal = address.toLowerCase();
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const users = data?.users ?? [];
      const linked = users.find(
        (u) =>
          u.user_metadata?.wallet_address?.toLowerCase() === normal &&
          u.email &&
          !u.email.endsWith("@wallet.arkive.app"),
      );
      if (!linked?.email) { res.status(404).json({ error: "No linked account found" }); return; }
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: linked.email,
      });
      if (linkError) throw linkError;
      const tokenHash = linkData?.properties?.hashed_token;
      if (!tokenHash) throw new Error("Failed to generate login link");
      res.json({ token_hash: tokenHash, type: "magiclink" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: msg });
    }
    return;
  }

  res.status(404).json({ error: "Not found" });
}
