import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, type App } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import SplashScreen from '@/components/splashScreen/index.vue'

let app: App | undefined

const setupWindowStubs = (options: { windowId?: number; noSplash?: string } = {}) => {
  const w = window as unknown as {
    electron?: {
      process?: {
        platform: string
        env: Record<string, string | undefined>
      }
      ipcRenderer?: {
        on: () => void
      }
    }
    marktext?: {
      env?: {
        windowId?: number
      }
    }
  }

  w.electron = {
    process: {
      platform: 'linux',
      env: {
        MARKTEXT_VERSION_STRING: 'v0.24.0-dev',
        ...(options.noSplash ? { MARKTEXT_NO_SPLASH: options.noSplash } : {})
      }
    },
    ipcRenderer: {
      on: vi.fn()
    }
  }
  w.marktext = {
    env: options.windowId !== undefined ? { windowId: options.windowId } : {}
  }
}

const mountSplash = (props: { displayMs?: number; fadeMs?: number } = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const root = document.createElement('div')
  document.body.append(root)
  app = createApp({
    setup: () => () => h(SplashScreen, props)
  })
  app.use(pinia)
  app.mount(root)
  return root
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('SplashScreen', () => {
  it('renders the MarkMed logo and title at startup and dismisses after timeout', async() => {
    setupWindowStubs({ windowId: 1 })
    const root = mountSplash({ displayMs: 2000, fadeMs: 300 })

    const splash = root.querySelector<HTMLElement>('.markmed-splash')
    expect(splash).not.toBeNull()
    expect(root.querySelectorAll('.splash-layer').length).toBe(6)
    expect(root.querySelector<HTMLImageElement>('.splash-logo')?.alt).toBe('MarkMed')
    expect(root.querySelector('.splash-title')?.textContent?.trim()).toBe('MarkMed')
    expect(root.querySelector('.splash-version')?.textContent?.trim()).toBe('v0.24.0-dev')

    await vi.advanceTimersByTimeAsync(2000)
    await nextTick()
    expect(root.querySelector('.markmed-splash')?.classList.contains('is-leaving')).toBe(true)

    await vi.advanceTimersByTimeAsync(300)
    await nextTick()
    expect(root.querySelector('.markmed-splash')).toBeNull()
  })

  it('dismisses early when clicked', async() => {
    setupWindowStubs({ windowId: 1 })
    const root = mountSplash({ displayMs: 2400, fadeMs: 250 })

    root.querySelector<HTMLElement>('.markmed-splash')?.click()
    await nextTick()
    expect(root.querySelector('.markmed-splash')?.classList.contains('is-leaving')).toBe(true)

    await vi.advanceTimersByTimeAsync(250)
    await nextTick()
    expect(root.querySelector('.markmed-splash')).toBeNull()
  })

  it('skips rendering when MARKTEXT_NO_SPLASH is set or for secondary windows', () => {
    setupWindowStubs({ windowId: 1, noSplash: '1' })
    const rootNoSplash = mountSplash()
    expect(rootNoSplash.querySelector('.markmed-splash')).toBeNull()

    app?.unmount()
    app = undefined
    document.body.innerHTML = ''

    setupWindowStubs({ windowId: 2 })
    const rootSecondary = mountSplash()
    expect(rootSecondary.querySelector('.markmed-splash')).toBeNull()
  })
})
