import { describe, expect, it } from 'vitest'
import { resolvePlainTextToCopy } from '@/util/copyPlainText'

describe('resolvePlainTextToCopy', () => {
  it('converts full Markdown document to plain text when there is no selection', () => {
    const result = resolvePlainTextToCopy({
      markdown: '# Receita\n\n- **Dipirona** 500mg\n',
      selectedText: '',
      isSourceCode: false
    })
    expect(result).toBe('Receita\n- Dipirona 500mg')
  })

  it('returns WYSIWYG selected text directly and collapses double paragraph breaks', () => {
    const result = resolvePlainTextToCopy({
      markdown: '# Receita\n\n- **Dipirona** 500mg\n',
      selectedText: 'Linha 1\n\nLinha 2',
      isSourceCode: false
    })
    expect(result).toBe('Linha 1\nLinha 2')
  })

  it('strips Markdown markers from selected text in source code mode', () => {
    const result = resolvePlainTextToCopy({
      markdown: '# Receita\n\n- **Dipirona** 500mg\n',
      selectedText: '**Dipirona** `500mg`',
      isSourceCode: true
    })
    expect(result).toBe('Dipirona 500mg')
  })
})
