import { useQuery, useMutation, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Beneficiary = {
  id: string;
  name: string;
  email: string;
  walletAddress: string | null;
  phone: string | null;
  allocationPercent: string;
  createdAt: string;
};

export type Guardian = {
  id: string;
  name: string;
  email: string;
  walletAddress: string | null;
  phone: string | null;
  telegramUsername: string | null;
  status: string;
  createdAt: string;
};

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  amount: string;
  valueUsd: string;
  beneficiaryId: string | null;
  beneficiaryName?: string;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
};

export type InactivitySettings = {
  id: string;
  inactivityDays: number;
  checkIntervalDays: number;
  autoCheckInEnabled: boolean;
  multiSignalEnabled: boolean;
  timeDelayEnabled: boolean;
  timeDelayDays: number;
  finalWarningEnabled: boolean;
  requiredApprovals: number;
  totalGuardians: number;
  currentStatus: string;
  lastCheckIn: string | null;
  createdAt: string;
};

export type DashboardSummary = {
  totalAssets: number;
  totalValueUsd: number;
  totalBeneficiaries: number;
  totalGuardians: number;
  status: string;
  lastCheckIn: string | null;
};

const mapBeneficiary = (r: any): Beneficiary => ({
  id: r.id, name: r.name, email: r.email, walletAddress: r.wallet_address,
  phone: r.phone, allocationPercent: String(r.allocation_percent), createdAt: r.created_at,
});

const mapGuardian = (r: any): Guardian => ({
  id: r.id, name: r.name, email: r.email, walletAddress: r.wallet_address,
  phone: r.phone, telegramUsername: r.telegram_username ?? null,
  status: r.status, createdAt: r.created_at,
});

const mapAsset = (r: any): Asset => ({
  id: r.id, symbol: r.symbol, name: r.name, amount: String(r.amount),
  valueUsd: String(r.value_usd), beneficiaryId: r.beneficiary_id,
  beneficiaryName: r.beneficiaries?.name, createdAt: r.created_at,
});

const mapLog = (r: any): ActivityLog => ({
  id: r.id, type: r.type, message: r.message, severity: r.severity, timestamp: r.timestamp,
});

const mapSettings = (r: any): InactivitySettings => ({
  id: r.id, inactivityDays: r.inactivity_days, checkIntervalDays: r.check_interval_days,
  autoCheckInEnabled: r.auto_check_in_enabled, multiSignalEnabled: r.multi_signal_enabled,
  timeDelayEnabled: r.time_delay_enabled, timeDelayDays: r.time_delay_days,
  finalWarningEnabled: r.final_warning_enabled, requiredApprovals: r.required_approvals,
  totalGuardians: r.total_guardians, currentStatus: r.current_status,
  lastCheckIn: r.last_check_in, createdAt: r.created_at,
});

export const getListBeneficiariesQueryKey = () => ["beneficiaries"] as const;
export const getListGuardiansQueryKey = () => ["guardians"] as const;
export const getListAssetsQueryKey = () => ["assets"] as const;
export const getListActivityQueryKey = () => ["activity_logs"] as const;
export const getGetInactivitySettingsQueryKey = () => ["inactivity_settings"] as const;
export const getGetDashboardSummaryQueryKey = () => ["dashboard_summary"] as const;
export const getProfileQueryKey = () => ["profile"] as const;
export const getListTrackedWalletsQueryKey = () => ["tracked_wallets"] as const;
export const getListVaultDepositsQueryKey = () => ["vault_deposits"] as const;

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

async function logEvent(
  message: string,
  severity: "info" | "warning" | "critical" = "info",
  type = "system"
) {
  try {
    const userId = await getUserId();
    await supabase.from("activity_logs").insert({ user_id: userId, message, severity, type });
  } catch {}
}

type QueryArg<T> = { query?: Partial<UseQueryOptions<T>> };
type MutationOpts = { mutation?: { onSuccess?: () => void; onError?: (e: unknown) => void } };

export function useListBeneficiaries(opts?: QueryArg<Beneficiary[]>) {
  return useQuery<Beneficiary[]>({
    queryKey: getListBeneficiariesQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("beneficiaries").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapBeneficiary);
    },
    ...opts?.query,
  });
}

export function useListGuardians(opts?: QueryArg<Guardian[]>) {
  return useQuery<Guardian[]>({
    queryKey: getListGuardiansQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("guardians").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapGuardian);
    },
    ...opts?.query,
  });
}

export function useListAssets(opts?: QueryArg<Asset[]>) {
  return useQuery<Asset[]>({
    queryKey: getListAssetsQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*, beneficiaries(name)").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapAsset);
    },
    ...opts?.query,
  });
}

export function useListActivity(opts?: QueryArg<ActivityLog[]>) {
  return useQuery<ActivityLog[]>({
    queryKey: getListActivityQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map(mapLog);
    },
    ...opts?.query,
  });
}

export function useGetInactivitySettings(opts?: QueryArg<InactivitySettings | null>) {
  return useQuery<InactivitySettings | null>({
    queryKey: getGetInactivitySettingsQueryKey(),
    queryFn: async () => {
      const userId = await getUserId();
      let { data, error } = await supabase.from("inactivity_settings").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) {
        const created = await supabase.from("inactivity_settings").insert({ user_id: userId }).select("*").single();
        if (created.error) throw created.error;
        data = created.data;
      }
      return mapSettings(data);
    },
    ...opts?.query,
  });
}

export function useGetDashboardSummary(opts?: QueryArg<DashboardSummary>) {
  return useQuery<DashboardSummary>({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: async () => {
      const [{ data: assets }, { data: bens }, { data: guards }, { data: settings }] = await Promise.all([
        supabase.from("assets").select("value_usd"),
        supabase.from("beneficiaries").select("id"),
        supabase.from("guardians").select("id"),
        supabase.from("inactivity_settings").select("current_status, last_check_in").maybeSingle(),
      ]);
      const totalValue = (assets ?? []).reduce((s, a: any) => s + Number(a.value_usd), 0);
      return {
        totalAssets: assets?.length ?? 0,
        totalValueUsd: totalValue,
        totalBeneficiaries: bens?.length ?? 0,
        totalGuardians: guards?.length ?? 0,
        status: settings?.current_status ?? "active",
        lastCheckIn: settings?.last_check_in ?? null,
      };
    },
    ...opts?.query,
  });
}

export type Profile = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
};

export function useGetProfile(opts?: QueryArg<Profile | null>) {
  return useQuery<Profile | null>({
    queryKey: getProfileQueryKey(),
    queryFn: async () => {
      const userId = await getUserId();
      let { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) {
        const created = await supabase.from("profiles").insert({ user_id: userId }).select("*").single();
        if (created.error) throw created.error;
        data = created.data;
      }
      return { id: data.id, userId: data.user_id, username: data.username, displayName: data.display_name };
    },
    ...opts?.query,
  });
}

export function useUpdateProfile(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: { username?: string; displayName?: string } }) => {
      const userId = await getUserId();
      const patch: any = {};
      if (data.username !== undefined) patch.username = data.username || null;
      if (data.displayName !== undefined) patch.display_name = data.displayName || null;
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
      if (error) throw error;
    },
    ...opts?.mutation,
  });
}

export function useUpdateEmail(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    },
    ...opts?.mutation,
  });
}

export function useCreateBeneficiary(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Beneficiary> }) => {
      const userId = await getUserId();
      const { error } = await supabase.from("beneficiaries").insert({
        user_id: userId, name: data.name!, email: data.email!,
        wallet_address: data.walletAddress ?? null, phone: data.phone ?? null,
        allocation_percent: Number(data.allocationPercent ?? 0),
      });
      if (error) throw error;
      await logEvent(`Beneficiary added: ${data.name}`);
    },
    ...opts?.mutation,
  });
}

export function useUpdateBeneficiary(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Beneficiary> }) => {
      const patch: any = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.email !== undefined) patch.email = data.email;
      if (data.walletAddress !== undefined) patch.wallet_address = data.walletAddress || null;
      if (data.phone !== undefined) patch.phone = data.phone || null;
      if (data.allocationPercent !== undefined) patch.allocation_percent = Number(data.allocationPercent);
      const { error } = await supabase.from("beneficiaries").update(patch).eq("id", id);
      if (error) throw error;
      await logEvent(`Beneficiary updated: ${data.name ?? ""}`, "info");
    },
    ...opts?.mutation,
  });
}

export function useDeleteBeneficiary(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("beneficiaries").delete().eq("id", id);
      if (error) throw error;
      await logEvent("Beneficiary removed", "warning");
    },
    ...opts?.mutation,
  });
}

export function useCreateGuardian(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Guardian> & { telegramUsername?: string } }) => {
      const userId = await getUserId();
      const payload: any = {
        user_id: userId, name: data.name!, email: data.email!,
        wallet_address: data.walletAddress ?? null, phone: data.phone ?? null,
        telegram_username: data.telegramUsername?.replace(/^@/, "") ?? null,
        status: data.status ?? "pending",
      };
      const { error } = await supabase.from("guardians").insert(payload);
      if (error) throw error;
      await logEvent(`Guardian added: ${data.name}`);
    },
    ...opts?.mutation,
  });
}

export function useUpdateGuardian(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Guardian> & { telegramUsername?: string } }) => {
      const patch: any = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.email !== undefined) patch.email = data.email;
      if (data.walletAddress !== undefined) patch.wallet_address = data.walletAddress || null;
      if (data.phone !== undefined) patch.phone = data.phone || null;
      if (data.telegramUsername !== undefined) patch.telegram_username = data.telegramUsername?.replace(/^@/, "") || null;
      if (data.status !== undefined) patch.status = data.status;
      const { error } = await supabase.from("guardians").update(patch).eq("id", id);
      if (error) throw error;
      await logEvent(`Guardian updated: ${data.name ?? ""}`, "info");
    },
    ...opts?.mutation,
  });
}

export function useDeleteGuardian(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("guardians").delete().eq("id", id);
      if (error) throw error;
      await logEvent("Guardian removed", "warning");
    },
    ...opts?.mutation,
  });
}

export function useCreateAsset(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Asset> }) => {
      const userId = await getUserId();
      const { error } = await supabase.from("assets").insert({
        user_id: userId, symbol: data.symbol!, name: data.name!,
        amount: Number(data.amount), value_usd: Number(data.valueUsd),
        beneficiary_id: data.beneficiaryId ?? null,
      });
      if (error) throw error;
      await logEvent(`Transfer rule added: ${data.amount} ${data.symbol}`);
    },
    ...opts?.mutation,
  });
}

export function useDeleteAsset(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
      await logEvent("Transfer rule removed", "warning");
    },
    ...opts?.mutation,
  });
}

export type TrackedWallet = {
  id: string;
  label: string | null;
  address: string;
  chain: string;
  lastUpdatedAt: string;
  createdAt: string;
};

export function useListTrackedWallets(opts?: QueryArg<TrackedWallet[]>) {
  return useQuery<TrackedWallet[]>({
    queryKey: getListTrackedWalletsQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("tracked_wallets").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id, label: r.label, address: r.address, chain: r.chain,
        lastUpdatedAt: r.last_updated_at, createdAt: r.created_at,
      }));
    },
    ...opts?.query,
  });
}

export function useCreateTrackedWallet(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: { label?: string; address: string; chain?: string } }) => {
      const userId = await getUserId();
      const { error } = await supabase.from("tracked_wallets").insert({
        user_id: userId, label: data.label ?? null,
        address: data.address, chain: data.chain ?? "arc-testnet",
      });
      if (error) throw error;
      await logEvent("Tracked wallet added");
    },
    ...opts?.mutation,
  });
}

export function useUpdateTrackedWallet(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { label?: string; address?: string } }) => {
      const patch: any = {};
      if (data.label !== undefined) patch.label = data.label;
      if (data.address !== undefined) patch.address = data.address;
      const { error } = await supabase.from("tracked_wallets").update(patch).eq("id", id);
      if (error) throw error;
    },
    ...opts?.mutation,
  });
}

export function useDeleteTrackedWallet(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("tracked_wallets").delete().eq("id", id);
      if (error) throw error;
    },
    ...opts?.mutation,
  });
}

export type VaultDeposit = {
  id: string;
  fromAddress: string;
  amount: string;
  token: string;
  chainId: number;
  txHash: string;
  status: string;
  createdAt: string;
};

export function useListVaultDeposits(opts?: QueryArg<VaultDeposit[]>) {
  return useQuery<VaultDeposit[]>({
    queryKey: getListVaultDepositsQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.from("vault_deposits").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id, fromAddress: r.from_address, amount: String(r.amount), token: r.token,
        chainId: r.chain_id, txHash: r.tx_hash, status: r.status, createdAt: r.created_at,
      }));
    },
    ...opts?.query,
  });
}

export function useRecordVaultDeposit(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: { fromAddress: string; amount: string; token?: string; chainId: number; txHash: string } }) => {
      const userId = await getUserId();
      const { error } = await supabase.from("vault_deposits").insert({
        user_id: userId, from_address: data.fromAddress,
        amount: Number(data.amount), token: data.token ?? "USDC",
        chain_id: data.chainId, tx_hash: data.txHash, status: "deposit",
      });
      if (error) throw error;
      await logEvent(`Vault deposit: ${data.amount} ${data.token ?? "USDC"}`);
    },
    ...opts?.mutation,
  });
}

export function useRecordVaultWithdrawal(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: { fromAddress: string; amount: string; token?: string; chainId: number; txHash: string } }) => {
      const userId = await getUserId();
      const { error } = await supabase.from("vault_deposits").insert({
        user_id: userId, from_address: data.fromAddress,
        amount: Number(data.amount), token: data.token ?? "USDC",
        chain_id: data.chainId, tx_hash: data.txHash, status: "withdraw",
      });
      if (error) throw error;
      await logEvent(`Vault withdrawal: ${data.amount} ${data.token ?? "USDC"}`);
    },
    ...opts?.mutation,
  });
}

export function useUpdateInactivitySettings(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<InactivitySettings> }) => {
      const userId = await getUserId();
      const patch: any = {};
      if (data.inactivityDays !== undefined) patch.inactivity_days = data.inactivityDays;
      if (data.checkIntervalDays !== undefined) patch.check_interval_days = data.checkIntervalDays;
      if (data.autoCheckInEnabled !== undefined) patch.auto_check_in_enabled = data.autoCheckInEnabled;
      if (data.multiSignalEnabled !== undefined) patch.multi_signal_enabled = data.multiSignalEnabled;
      if (data.timeDelayEnabled !== undefined) patch.time_delay_enabled = data.timeDelayEnabled;
      if (data.timeDelayDays !== undefined) patch.time_delay_days = data.timeDelayDays;
      if (data.finalWarningEnabled !== undefined) patch.final_warning_enabled = data.finalWarningEnabled;
      if (data.requiredApprovals !== undefined) patch.required_approvals = data.requiredApprovals;
      if (data.totalGuardians !== undefined) patch.total_guardians = data.totalGuardians;
      if (data.currentStatus !== undefined) patch.current_status = data.currentStatus;

      const { data: existing } = await supabase.from("inactivity_settings").select("id").eq("user_id", userId).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("inactivity_settings").insert({ user_id: userId, ...patch });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inactivity_settings").update(patch).eq("user_id", userId);
        if (error) throw error;
      }
      await logEvent("Settings updated");
    },
    ...opts?.mutation,
  });
}

export function useCheckIn(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from("inactivity_settings").select("id").eq("user_id", userId).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("inactivity_settings").insert({ user_id: userId, last_check_in: now, current_status: "active" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inactivity_settings").update({ last_check_in: now, current_status: "active" }).eq("user_id", userId);
        if (error) throw error;
      }
      await logEvent("Manual check-in — user confirmed alive", "info", "check-in");
    },
    ...opts?.mutation,
  });
}

export function usePanicReset(opts?: MutationOpts) {
  return useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const now = new Date().toISOString();
      const { error } = await supabase.from("inactivity_settings")
        .update({ current_status: "active", last_check_in: now })
        .eq("user_id", userId);
      if (error) throw error;
      await logEvent("🚨 PANIC RESET — transfer aborted, system reset to active by user", "critical", "panic");
    },
    ...opts?.mutation,
  });
}
