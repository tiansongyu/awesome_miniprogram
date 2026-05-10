export function generateOrderNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${date}${random}`;
}

export function generateBindCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
