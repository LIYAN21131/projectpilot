export function formatResumeQualityChange(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
