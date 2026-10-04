const SCALE = 1_000_000n;

export function ethUnits(value: string): bigint {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) throw new Error("Valor ETH inválido.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
}

export function ethString(units: bigint): string {
  const sign = units < 0n ? "-" : "";
  const absolute = units < 0n ? -units : units;
  const fractional = (absolute % SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return `${sign}${absolute / SCALE}${fractional ? `.${fractional}` : ""}`;
}
