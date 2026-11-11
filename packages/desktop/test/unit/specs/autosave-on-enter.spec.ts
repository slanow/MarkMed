import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.hoisted(() => {
  const w = window as unknown as {
    path?: { sep: string }
    electron?: {
      process?: { platform: string; env: Record<string, string> }
      ipcRenderer?: { send: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> }
    }
  }
  w.path = { sep: '/' }
  w.electron = {
    process: { platform: 'linux', env: {} },
    ipcRenderer: { send: vi.fn(), on: vi.fn() }
  }
})

import { usePreferencesStore } from '@/store/preferences'
import { useEditorStore, setSessionActions, type SessionActions } from '@/store/editor'

describe('Auto-save on Enter and preferences', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const w = window as unknown as {
      electron?: {
        process?: { platform: string; env: Record<string, string> }
        ipcRenderer?: { send: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> }
      }
    }
    w.electron = {
      process: { platform: 'linux', env: {} },
      ipcRenderer: { send: vi.fn(), on: vi.fn() }
    }
  })

  it('persists autoSaveOnEnter and autoSaveDelay via SET_SINGLE_PREFERENCE', () => {
    const prefs = usePreferencesStore()
    expect(prefs.autoSaveOnEnter).toBe(false)

    prefs.SET_SINGLE_PREFERENCE({ type: 'autoSaveOnEnter', value: true })
    expect(prefs.autoSaveOnEnter).toBe(true)

    prefs.SET_SINGLE_PREFERENCE({ type: 'autoSaveDelay', value: 15000 })
    expect(prefs.autoSaveDelay).toBe(15000)
  })

  it('immediately saves modified saved tab on SAVE_ON_ENTER even if timed autoSave is off', () => {
    const saveSpy = vi.fn().mockResolvedValue({ ok: true })
    setSessionActions({
      checkpoint: vi.fn(),
      scheduleCheckpoint: vi.fn(),
      captureView: vi.fn(),
      save: saveSpy,
      create: vi.fn(),
      close: vi.fn(),
      saveAll: vi.fn()
    } as unknown as SessionActions)

    const prefs = usePreferencesStore()
    prefs.autoSave = false
    prefs.autoSaveOnEnter = true

    const editor = useEditorStore()
    editor.tabs = [
      {
        id: 'tab-1',
        pathname: '/tmp/prontuario.md',
        filename: 'prontuario.md',
        markdown: 'Paciente estável\n',
        isSaved: false,
        readOnly: false,
        modeChanging: false,
        diskConflict: false
      } as unknown as (typeof editor.tabs)[number]
    ]

    editor.SAVE_ON_ENTER('tab-1')
    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(saveSpy).toHaveBeenCalledWith('tab-1')
  })
})
