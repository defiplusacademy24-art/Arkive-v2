import { useState, useEffect, useCallback, useRef } from "react";
import { VAULT_ADDRESS, ARC_CHAIN, isArcChain, encodeGetVaultBalance } from "@/lib/chain";

function formatUsdc(raw: bigint): string {
  const dec = ARC_CHAIN.usdc.decimals;
  const divisor = 10n ** BigInt(dec);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(dec, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function useVaultBalance() {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [onArc, setOnArc] = useState(false);

  const addrRef = useRef<string | null>(null);
  const onArcRef = useRef(false);

  const fetchBalance = useCallback(async (addr: string) => {
    const provider = (window as any).ethereum;
    if (!provider) return;
    setLoading(true);
    try {
      const data = encodeGetVaultBalance(addr);
      const result = (await provider.request({
        method: "eth_call",
        params: [{ to: VAULT_ADDRESS, data }, "latest"],
      })) as string;
      setBalance(result && result !== "0x" ? formatUsdc(BigInt(result)) : "0");
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const provider = (window as any).ethereum;
    if (!provider) return;

    (async () => {
      try {
        const [accs, cid] = await Promise.all([
          provider.request({ method: "eth_accounts" }) as Promise<string[]>,
          provider.request({ method: "eth_chainId" }) as Promise<string>,
        ]);
        const addr = accs?.[0] ?? null;
        const arc = isArcChain(cid);
        addrRef.current = addr;
        onArcRef.current = arc;
        setAddress(addr);
        setOnArc(arc);
        if (addr && arc) fetchBalance(addr);
      } catch {}
    })();

    const onChain = (cid: string) => {
      const arc = isArcChain(cid);
      onArcRef.current = arc;
      setOnArc(arc);
      if (addrRef.current && arc) fetchBalance(addrRef.current);
      else setBalance(null);
    };
    const onAccounts = (accs: string[]) => {
      const addr = accs?.[0] ?? null;
      addrRef.current = addr;
      setAddress(addr);
      if (addr && onArcRef.current) fetchBalance(addr);
      else setBalance(null);
    };

    provider.on?.("chainChanged", onChain);
    provider.on?.("accountsChanged", onAccounts);
    return () => {
      provider.removeListener?.("chainChanged", onChain);
      provider.removeListener?.("accountsChanged", onAccounts);
    };
  }, [fetchBalance]);

  useEffect(() => {
    if (!address || !onArc) return;
    const id = setInterval(() => fetchBalance(address), 30_000);
    return () => clearInterval(id);
  }, [address, onArc, fetchBalance]);

  return {
    balance,
    loading,
    address,
    onArc,
    refresh: () => {
      if (addrRef.current && onArcRef.current) fetchBalance(addrRef.current);
    },
  };
}
