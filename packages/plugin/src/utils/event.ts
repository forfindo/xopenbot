export function extraSubEvents(event: string) {
  const parts = event.split('.').filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join('.'));
}
