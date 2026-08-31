// Live USD->EUR rate for converting USD accounts into the Net Worth total.
// Frankfurter (ECB-sourced, no API key) with a fixed fallback if the fetch
// fails - net worth should still render something sane, not break.
const FALLBACK_USD_TO_EUR = 0.92;

export async function getUsdToEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_USD_TO_EUR;
    const data = (await res.json()) as { rates?: { EUR?: number } };
    const rate = data.rates?.EUR;
    return typeof rate === "number" && rate > 0 ? rate : FALLBACK_USD_TO_EUR;
  } catch {
    return FALLBACK_USD_TO_EUR;
  }
}
