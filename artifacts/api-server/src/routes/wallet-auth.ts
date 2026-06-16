import { Router } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, any, any>;

function getAdminClient(): AdminClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as AdminClient;
}

function walletCredentials(normalAddress: string) {
  const hex = normalAddress.slice(2);
  const email = `wk${hex}@arkive.app`;
  const password = `wk_${hex}`;
  return { email, password };
}

router.post("/wallet/signup", async (req, res) => {
  const { address, email } = req.body as {
    address?: string;
    email?: string;
  };
  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  try {
    const admin = getAdminClient();
    const normalAddress = address.toLowerCase();
    const { email: walletEmail, password: walletPassword } = walletCredentials(normalAddress);

    const { error: createErr } = await admin.auth.admin.createUser({
      email: walletEmail,
      password: walletPassword,
      email_confirm: true,
      user_metadata: {
        wallet_address: normalAddress,
        display_name: `${address.slice(0, 6)}…${address.slice(-4)}`,
        ...(email ? { contact_email: email } : {}),
      },
    });

    if (createErr && !createErr.message.toLowerCase().includes("already")) {
      throw createErr;
    }

    return res.json({ ok: true });
  } catch (err: unknown) {
    req.log.error({ err }, "wallet signup error");
    const msg = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: msg });
  }
});

/**
 * Check if an email/Google account has this wallet linked (via user_metadata.wallet_address).
 * Returns a magic-link token_hash so the frontend can log into that linked account.
 */
router.post("/wallet/linked-signin", async (req, res) => {
  const { address } = req.body as { address?: string };
  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  try {
    const admin = getAdminClient();
    const normalAddress = address.toLowerCase();

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const users = listData?.users ?? [];
    const linked = users.find(
      (u) =>
        (u.user_metadata?.wallet_address as string | undefined)?.toLowerCase() === normalAddress &&
        u.email &&
        !u.email.match(/^wk[0-9a-f]{40}@arkive\.app$/),
    );

    if (!linked || !linked.email) {
      return res.status(404).json({ error: "No linked account found" });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: linked.email,
    });
    if (linkError) throw linkError;

    const tokenHash = (linkData as any)?.properties?.hashed_token as string | undefined;
    if (!tokenHash) throw new Error("Failed to generate login link");

    return res.json({ token_hash: tokenHash, type: "magiclink" });
  } catch (err: unknown) {
    req.log.error({ err }, "wallet linked-signin error");
    const msg = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
