export const ARC_CHAIN = {
  id: 5042002,
  hex: "0x4cef52",
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  currency: { name: "USDC", symbol: "USDC", decimals: 18 },
  usdc: {
    address: "0x3600000000000000000000000000000000000000",
    decimals: 6,
  },
} as const;

export const VAULT_ADDRESS = "0x86c5dFdA52AA8C7912fAf02b6393BD434d817059";

export function chainIdToHex(id: number) {
  return `0x${id.toString(16)}`;
}

export function isArcChain(chainIdHex: string | null | undefined) {
  if (!chainIdHex) return false;
  return parseInt(chainIdHex, 16) === ARC_CHAIN.id;
}

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export async function switchToArc(provider: Eip1193): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN.hex }],
    });
  } catch (err: any) {
    if (err?.code === 4902 || /Unrecognized chain/i.test(err?.message ?? "")) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ARC_CHAIN.hex,
            chainName: ARC_CHAIN.name,
            rpcUrls: [ARC_CHAIN.rpcUrl],
            blockExplorerUrls: [ARC_CHAIN.explorer],
            nativeCurrency: ARC_CHAIN.currency,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export function encodeErc20Transfer(to: string, amount: bigint): string {
  const selector = "a9059cbb";
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amt = amount.toString(16).padStart(64, "0");
  return `0x${selector}${addr}${amt}`;
}

export function encodeErc20Approve(spender: string, amount: bigint): string {
  const selector = "095ea7b3"; // approve(address,uint256)
  const addr = spender.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amt = amount.toString(16).padStart(64, "0");
  return `0x${selector}${addr}${amt}`;
}

export function encodeErc20Allowance(owner: string, spender: string): string {
  const selector = "dd62ed3e"; // allowance(address,address)
  const ownerPadded = owner.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const spenderPadded = spender.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return `0x${selector}${ownerPadded}${spenderPadded}`;
}

export function encodeErc20BalanceOf(owner: string): string {
  const selector = "70a08231"; // balanceOf(address)
  const addr = owner.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return `0x${selector}${addr}`;
}

export function encodeGetVaultBalance(user: string): string {
  const selector = "d3d7c002"; // getVaultBalance(address)
  const addr = user.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return `0x${selector}${addr}`;
}

export function encodeVaultDeposit(amount: bigint): string {
  const selector = "b6b55f25"; // deposit(uint256)
  const amt = amount.toString(16).padStart(64, "0");
  return `0x${selector}${amt}`;
}

export function encodeVaultWithdraw(): string {
  return "0x3ccfd60b"; // withdraw() — no parameters, withdraws full balance
}

type Eip1193Waiter = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export async function waitForReceipt(
  provider: Eip1193Waiter,
  txHash: string,
  timeoutMs = 90_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as { status?: string } | null;
    if (receipt?.status === "0x1") return;
    if (receipt?.status === "0x0") throw new Error("Transaction reverted on-chain");
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Transaction confirmation timeout — check the explorer");
}

export function parseUnits(value: string, decimals: number): bigint {
  const [whole, frac = ""] = value.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

export async function fetchVaultBalanceFromRpc(userAddress: string): Promise<string> {
  const data = encodeGetVaultBalance(userAddress);
  const res = await fetch(ARC_CHAIN.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: VAULT_ADDRESS, data }, "latest"],
      id: 1,
    }),
  });
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  const hex = json.result ?? "0x";
  if (!hex || hex === "0x") return "0";
  const raw = BigInt(hex);
  const dec = ARC_CHAIN.usdc.decimals;
  const whole = raw / BigInt(10 ** dec);
  const frac = raw % BigInt(10 ** dec);
  const fracStr = frac.toString().padStart(dec, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
