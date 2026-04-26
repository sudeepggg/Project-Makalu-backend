// small helpers
export function isNonEmptyString(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}