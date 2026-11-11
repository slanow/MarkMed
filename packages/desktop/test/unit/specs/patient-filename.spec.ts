import { describe, expect, it } from 'vitest'
import {
  buildDatedPatientFilename,
  createInitialPatientNoteMarkdown,
  extractCreationStampFromFilename,
  extractPatientNameFromMarkdown,
  shouldAutoRenamePath
} from '@shared/utils/patientFilename'

describe('patientFilename helpers', () => {
  it('extracts and sanitizes patient name from heading or plain first line', () => {
    expect(extractPatientNameFromMarkdown('# João da Silva\n\nEvolução')).toBe('João-da-Silva')
    expect(extractPatientNameFromMarkdown('\n\n  Maria/Oliveira: Leito 04* \n')).toBe(
      'Maria-Oliveira-Leito-04'
    )
    expect(extractPatientNameFromMarkdown('   #   \n\n**Data/Hora:** 11/11/2026 04:00')).toBeNull()
    expect(extractPatientNameFromMarkdown('   \n   \n')).toBeNull()
  })

  it('builds <Nome>_YYYY-MM-DD_HH-mm.md and preserves an existing creation stamp', () => {
    const first = buildDatedPatientFilename({
      currentFilename: 'Sem titulo.md',
      patientName: 'Ana-Paula',
      createdAt: new Date(2026, 10, 11, 4, 15)
    })
    expect(first).toBe('Ana-Paula_2026-11-11_04-15.md')

    const updated = buildDatedPatientFilename({
      currentFilename: first,
      patientName: 'Ana-Paula-Santos',
      createdAt: new Date(2026, 11, 20, 18, 30)
    })
    expect(updated).toBe('Ana-Paula-Santos_2026-11-11_04-15.md')
    expect(extractCreationStampFromFilename(updated)).toBe('2026-11-11_04-15')
  })

  it('creates initial note header with creation date and time ready for patient name', () => {
    const content = createInitialPatientNoteMarkdown(new Date(2026, 10, 11, 9, 5))
    expect(content).toBe('# \n\n**Data/Hora:** 11/11/2026 09:05\n\n')
    expect(extractPatientNameFromMarkdown(content)).toBeNull()

    const namedContent = createInitialPatientNoteMarkdown(
      new Date(2026, 10, 11, 9, 5),
      'Maria Eulalia Costa'
    )
    expect(namedContent).toBe('# Maria Eulalia Costa\n\n**Data/Hora:** 11/11/2026 09:05\n\n')
    expect(extractPatientNameFromMarkdown(namedContent)).toBe('Maria-Eulalia-Costa')
  })

  it('allows auto-rename for markdown or extensionless notes while excluding README and dotfiles', () => {
    const roots = ['/pendrive/Prontuarios']
    expect(shouldAutoRenamePath('/pendrive/Prontuarios/2026-11/nota.md', roots)).toBe(true)
    expect(shouldAutoRenamePath('/pendrive/Prontuarios/Maria eulalia costa', roots)).toBe(true)
    expect(shouldAutoRenamePath('/pendrive/OutroLugar/nota.md', [])).toBe(true)
    expect(shouldAutoRenamePath('/pendrive/Prontuarios/README.md', roots)).toBe(false)
    expect(shouldAutoRenamePath('/pendrive/Prontuarios/.oculto.md', roots)).toBe(false)
    expect(shouldAutoRenamePath('/pendrive/Prontuarios/foto.png', roots)).toBe(false)
  })
})
