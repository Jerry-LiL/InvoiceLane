export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string') return '/dashboard';
  if (!value.startsWith('/dashboard')) return '/dashboard';
  if (value.startsWith('//') || value.includes('\\') || value.includes('://')) return '/dashboard';
  return value;
}
