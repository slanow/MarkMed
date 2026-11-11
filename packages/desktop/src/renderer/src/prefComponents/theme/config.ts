export interface ThemeDescriptor {
  name: string
}

export const themes: ReadonlyArray<ThemeDescriptor> = [
  { name: 'light' },
  { name: 'dark' }
]

export const themeLabel = (name: string): string =>
  name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
