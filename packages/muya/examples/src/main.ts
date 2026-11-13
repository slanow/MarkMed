/* eslint-disable antfu/no-top-level-await */
import type { IMuyaOptions } from '@muyajs/core';
import {
    CodeBlockLanguageSelector,
    EmojiSelector,
    FootnoteTool,
    ImageEditTool,
    ImageResizeBar,
    ImageToolBar,
    InlineFormatToolbar,
    LinkTools,
    Muya,
    ParagraphFrontButton,
    ParagraphFrontMenu,
    ParagraphQuickInsertMenu,
    pt,
    TableChessboard,
    TableColumnToolbar,
    TableDragBar,
    TableRowColumMenu,
} from '@muyajs/core';

import { DEFAULT_MARKDOWN } from './data';
import { markdownToPlainText } from './markdownToPlainText';
import './style.css';

// ---------- Firefox Intl.Segmenter polyfill ----------
const intlNs = Intl as unknown as { Segmenter?: typeof Intl.Segmenter };
if (!intlNs.Segmenter) {
    const polyfill = await import('intl-segmenter-polyfill/dist/bundled');
    intlNs.Segmenter = await polyfill.createIntlSegmenterPolyfill() as typeof Intl.Segmenter;
}

// ---------- Register UI plugins ----------
Muya.use(EmojiSelector);
Muya.use(FootnoteTool);
Muya.use(InlineFormatToolbar);
Muya.use(ImageEditTool);
Muya.use(ImageToolBar);
Muya.use(ImageResizeBar);
Muya.use(CodeBlockLanguageSelector);
Muya.use(LinkTools, {
    jumpClick: (linkInfo: { href?: string } | null) => {
        const href = linkInfo?.href;
        if (href && /^https?:\/\//.test(href)) {
            window.open(href, '_blank', 'noopener,noreferrer');
        }
    },
});
Muya.use(ParagraphFrontButton);
Muya.use(ParagraphFrontMenu);
Muya.use(TableChessboard);
Muya.use(TableColumnToolbar);
Muya.use(ParagraphQuickInsertMenu);
Muya.use(TableDragBar);
Muya.use(TableRowColumMenu);

// ---------- Initialize Muya Editor ----------
const container = document.querySelector('#editor') as HTMLElement;
const savedMarkdown = localStorage.getItem('markmed_web_demo_content') || DEFAULT_MARKDOWN;

const options: Partial<IMuyaOptions> = {
    fontSize: 16,
    lineHeight: 1.6,
    tabSize: 4,
    locale: pt,
    hideQuickInsertHint: false,
};

const muya = new Muya(container, options);
muya.init();
muya.setContent(savedMarkdown);

// Save to localStorage on change
muya.on('change', () => {
    try {
        localStorage.setItem('markmed_web_demo_content', muya.getMarkdown());
    } catch {
        // Ignore quota errors
    }
});

// ---------- Toast Notification ----------
function showToast(message: string, isSuccess = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${isSuccess ? 'toast-success' : 'toast-info'}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ---------- Copiar TXT (Plain Text) ----------
const btnCopyTxt = document.getElementById('btn-copy-txt');
btnCopyTxt?.addEventListener('click', async () => {
    try {
        const markdown = muya.getMarkdown();
        const selection = window.getSelection()?.toString();
        const textToConvert = selection && selection.trim().length > 0 ? selection : markdown;
        const plainText = markdownToPlainText(textToConvert);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(plainText);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = plainText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }

        showToast(
            selection && selection.trim().length > 0
                ? 'Trecho selecionado copiado como texto limpo!'
                : 'Evolução inteira copiada como texto limpo para o prontuário!'
        );
    } catch (err) {
        console.error(err);
        showToast('Não foi possível copiar automaticamente.', false);
    }
});

// ---------- Reset Demo ----------
const btnReset = document.getElementById('btn-reset');
btnReset?.addEventListener('click', () => {
    if (confirm('Deseja restaurar o modelo de exemplo padrão?')) {
        muya.setContent(DEFAULT_MARKDOWN);
        localStorage.setItem('markmed_web_demo_content', DEFAULT_MARKDOWN);
        showToast('Modelo padrão restaurado!');
    }
});

// ---------- Clear All ----------
const btnClear = document.getElementById('btn-clear');
btnClear?.addEventListener('click', () => {
    if (confirm('Deseja limpar todo o texto da tela?')) {
        muya.setContent('# \n\n');
        localStorage.removeItem('markmed_web_demo_content');
        showToast('Editor limpo!');
    }
});
