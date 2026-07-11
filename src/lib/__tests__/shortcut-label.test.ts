import { describe, it, expect } from 'vitest';
import { splitShortcutLabel } from '../shortcut-label';

describe('splitShortcutLabel', () => {
  it('splits a basic shortcut into separate keys', () => {
    expect(splitShortcutLabel('Ctrl+V')).toEqual(['Ctrl', 'V']);
  });

  it('splits an Apple shortcut into separate keys', () => {
    expect(splitShortcutLabel('⌘+V')).toEqual(['⌘', 'V']);
  });

  it('supports shortcuts with multiple modifiers', () => {
    expect(splitShortcutLabel('Ctrl+Shift+V')).toEqual(['Ctrl', 'Shift', 'V']);
  });

  it('ignores empty segments caused by extra separators', () => {
    expect(splitShortcutLabel('Ctrl++V')).toEqual(['Ctrl', 'V']);
  });
});
