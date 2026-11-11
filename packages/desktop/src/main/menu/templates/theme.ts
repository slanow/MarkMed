import { type MenuItemConstructorOptions } from 'electron'
import * as actions from '../actions/theme'
import { t } from '../../i18n'
import type Preference from '../../preferences'

const SIMPLE_THEMES: ReadonlyArray<readonly [string, string]> = [
  ['preferences.theme.filter.light', 'light'],
  ['preferences.theme.filter.dark', 'dark']
]

export default function(userPreference: Preference): MenuItemConstructorOptions {
  const preferences = userPreference.getAll() as { theme?: string; followSystemTheme?: boolean }
  const { theme, followSystemTheme } = preferences
  const isThemeSelectionEnabled = !followSystemTheme

  const themeRadio = ([labelKey, id]: readonly [string, string]): MenuItemConstructorOptions => ({
    label: t(labelKey),
    type: 'radio',
    id,
    enabled: isThemeSelectionEnabled,
    checked: theme === id,
    click() {
      actions.selectTheme(id)
    }
  })

  const submenu: MenuItemConstructorOptions[] = [
    {
      label: t('preferences.theme.followSystemTheme'),
      type: 'checkbox',
      id: 'follow-system-theme',
      checked: !!followSystemTheme,
      click(menuItem) {
        actions.setFollowSystemTheme(menuItem.checked)
      }
    }
  ]

  if (!isThemeSelectionEnabled) {
    submenu.push({
      label: t('menu.theme.followThemDisabled'),
      enabled: false
    })
  }

  submenu.push({ type: 'separator' }, ...SIMPLE_THEMES.map(themeRadio))

  return {
    label: t('menu.theme.theme'),
    id: 'themeMenu',
    submenu
  }
}
