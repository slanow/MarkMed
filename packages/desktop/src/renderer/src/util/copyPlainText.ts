import { markdownToPlainText } from './markdownToPlainText'

export interface PlainTextCopySource {
  markdown: string
  selectedText?: string
  isSourceCode?: boolean
}

/**
 * Resolve the plain-text string to copy: selected text when present, or the
 * full Markdown document converted to clean plain text without Markdown markers.
 */
export const resolvePlainTextToCopy = ({
  markdown,
  selectedText = '',
  isSourceCode = false
}: PlainTextCopySource): string => {
  if (selectedText.trim().length > 0) {
    if (isSourceCode) return markdownToPlainText(selectedText)
    return selectedText
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }
  return markdownToPlainText(markdown)
}

export const getActiveEditorSelectionText = (): string => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return ''
  const anchorNode = selection.anchorNode
  if (!anchorNode) return ''
  const element = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
  if (!element || !element.closest('.editor-wrapper, .source-code')) return ''
  return selection.toString()
}

export const copyTextToClipboard = async(text: string): Promise<void> => {
  if (!text) return
  await window.electron.clipboard.writeText(text)
}
