import { describe, expect, it } from 'vitest'
import { themes } from '@/prefComponents/theme/config'
import themeMenu from 'main_renderer/menu/templates/theme'
import type Preference from 'main_renderer/preferences'

describe('MarkMed simplified theme options', () => {
  it('exposes only light and dark themes in preferences picker', () => {
    expect(themes.map((item) => item.name)).toEqual(['light', 'dark'])
  })

  it('exposes only followSystemTheme, light, and dark in the Theme menu', () => {
    const stubPref = {
      getAll: () => ({ theme: 'dark', followSystemTheme: false })
    } as unknown as Preference

    const menu = themeMenu(stubPref)
    const submenu = (menu.submenu ?? []) as Array<{ id?: string; type?: string }>
    const radioIds = submenu.filter((item) => item.type === 'radio').map((item) => item.id)

    expect(submenu.some((item) => item.id === 'follow-system-theme')).toBe(true)
    expect(radioIds).toEqual(['light', 'dark'])
  })
})
