export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs < 1000) return `${value}`;
  if (abs < 1_000_000) return `${sign}${trimDecimal(abs / 1_000)}K`;
  if (abs < 1_000_000_000) return `${sign}${trimDecimal(abs / 1_000_000)}M`;
  return `${sign}${trimDecimal(abs / 1_000_000_000)}B`;
}

function trimDecimal(n: number, digits = 1): string {
  const fixed = n.toFixed(digits);
  return fixed.replace(/\.0+$/, '');
}


