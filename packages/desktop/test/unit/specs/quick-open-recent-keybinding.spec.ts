import { describe, expect, it } from 'vitest'
import keybindingsDarwin from 'main_renderer/keyboard/keybindingsDarwin'
import keybindingsLinux from 'main_renderer/keyboard/keybindingsLinux'
import keybindingsWindows from 'main_renderer/keyboard/keybindingsWindows'

describe('quick open and print default keybindings', () => {
  it('binds Control+R on macOS and leaves Windows and Linux unbound for quick-open-recent', () => {
    expect(keybindingsDarwin.get('file.quick-open-recent')).toBe('Control+R')
    expect(keybindingsWindows.get('file.quick-open-recent')).toBe('')
    expect(keybindingsLinux.get('file.quick-open-recent')).toBe('')
  })

  it('binds Ctrl+P / Command+P to file.print and Ctrl+Alt+P / Command+Option+P to file.quick-open', () => {
    expect(keybindingsDarwin.get('file.print')).toBe('Command+P')
    expect(keybindingsWindows.get('file.print')).toBe('Ctrl+P')
    expect(keybindingsLinux.get('file.print')).toBe('Ctrl+P')

    expect(keybindingsDarwin.get('file.quick-open')).toBe('Command+Option+P')
    expect(keybindingsWindows.get('file.quick-open')).toBe('Ctrl+Alt+P')
    expect(keybindingsLinux.get('file.quick-open')).toBe('Ctrl+Alt+P')
  })
})
