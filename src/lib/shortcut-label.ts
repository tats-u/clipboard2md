export function splitShortcutLabel(shortcutLabel: string): string[] {
  return shortcutLabel
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}
