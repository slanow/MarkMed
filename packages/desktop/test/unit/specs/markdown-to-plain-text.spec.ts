import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from '@/util/markdownToPlainText'

describe('markdownToPlainText', () => {
  it('strips headings, emphasis, links, inline code, and blockquotes cleanly', () => {
    const md = [
      '# Evolução Clínica',
      '',
      'Paciente **estável**, refere *melhora* da dor (`EVA 2/10`) e ~~febre~~.',
      '',
      '> Manter ==hidratação== e acompanhar [exames](https://hospital.local/exames).',
      ''
    ].join('\n')

    expect(markdownToPlainText(md)).toBe(
      [
        'Evolução Clínica',
        'Paciente estável, refere melhora da dor (EVA 2/10) e febre.',
        'Manter hidratação e acompanhar exames.'
      ].join('\n')
    )
  })

  it('preserves snake_case identifiers, arithmetic stars, and escaped markers', () => {
    const md = 'Dosagem 2 * 5 mg, campo exame_hemograma, valor \\*importante\\*.'
    expect(markdownToPlainText(md)).toBe('Dosagem 2 * 5 mg, campo exame_hemograma, valor *importante*.')
  })

  it('formats lists, task items, tables, fenced code blocks, and strips frontmatter without extra blank lines', () => {
    const md = [
      '---',
      'title: Receita',
      '---',
      '',
      '* Dipirona 500mg',
      '+ Omeprazol 20mg',
      '- [ ] Hemograma',
      '- [x] Eletrocardiograma',
      '',
      '| Exame | Resultado |',
      '| --- | --- |',
      '| Glicemia | 92 mg/dL |',
      '',
      '```txt',
      'Observação final',
      '```'
    ].join('\n')

    expect(markdownToPlainText(md)).toBe(
      [
        '- Dipirona 500mg',
        '- Omeprazol 20mg',
        '[ ] Hemograma',
        '[x] Eletrocardiograma',
        'Exame | Resultado',
        'Glicemia | 92 mg/dL',
        'Observação final'
      ].join('\n')
    )
  })
})
