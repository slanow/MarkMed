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

import { DemoFileItem, INITIAL_FILE_SYSTEM } from './demoData';
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

// ---------- Local State & Virtual File System ----------
const STORAGE_KEY_FILES = 'markmed_demo_fs_v1';
const STORAGE_KEY_ACTIVE = 'markmed_demo_active_file_v1';

function loadFileSystem(): DemoFileItem[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_FILES);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // Fallback to default
    }
    return INITIAL_FILE_SYSTEM;
}

let fileSystem: DemoFileItem[] = loadFileSystem();
let activeFileId: string = localStorage.getItem(STORAGE_KEY_ACTIVE) || 'file-anamnese-cardio';

function saveFileSystem() {
    try {
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(fileSystem));
        localStorage.setItem(STORAGE_KEY_ACTIVE, activeFileId);
    } catch {
        // Ignore quota limits
    }
}

// ---------- Initialize Muya Editor ----------
const container = document.querySelector('#editor') as HTMLElement;
const options: Partial<IMuyaOptions> = {
    fontSize: 16,
    lineHeight: 1.6,
    tabSize: 4,
    locale: pt,
    hideQuickInsertHint: false,
};

const muya = new Muya(container, options);
muya.init();

function getActiveFile(): DemoFileItem | undefined {
    return fileSystem.find((item) => item.id === activeFileId && item.type === 'file');
}

function loadActiveContent() {
    let file = getActiveFile();
    if (!file) {
        // Find first file
        file = fileSystem.find((item) => item.type === 'file');
        if (file) activeFileId = file.id;
    }

    const titleEl = document.getElementById('current-filename');
    if (file) {
        if (titleEl) titleEl.textContent = file.name;
        muya.setContent(file.content || '# Novo Prontuário\n\n');
    } else {
        if (titleEl) titleEl.textContent = 'Sem arquivo aberto';
        muya.setContent('# \n\n');
    }
}

loadActiveContent();

// Save content on changes
muya.on('change', () => {
    const file = getActiveFile();
    if (file) {
        file.content = muya.getMarkdown();
        saveFileSystem();
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
    }, 2500);
}

// ---------- Tree View Rendering ----------
const treeContainer = document.getElementById('tree-container');

function renderTree() {
    if (!treeContainer) return;
    treeContainer.innerHTML = '';

    function renderItems(parentId: string | null, depth: number) {
        const items = fileSystem.filter((i) => i.parentId === parentId);

        // Folders first, then files
        items.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        for (const item of items) {
            const row = document.createElement('div');
            row.className = `tree-row ${item.id === activeFileId ? 'active' : ''}`;

            // Indent guides
            for (let d = 0; d < depth; d++) {
                const guide = document.createElement('span');
                guide.className = 'tree-indent-guide';
                row.appendChild(guide);
            }

            if (item.type === 'folder') {
                const arrow = document.createElement('span');
                arrow.className = `tree-arrow ${item.expanded ? 'expanded' : ''}`;
                arrow.innerHTML = '▶';
                row.appendChild(arrow);

                const icon = document.createElement('span');
                icon.className = 'tree-icon';
                icon.textContent = item.expanded ? '📂' : '📁';
                row.appendChild(icon);

                const label = document.createElement('span');
                label.className = 'tree-label';
                label.textContent = item.name;
                row.appendChild(label);

                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.expanded = !item.expanded;
                    saveFileSystem();
                    renderTree();
                });
            } else {
                const spacer = document.createElement('span');
                spacer.className = 'tree-arrow';
                spacer.textContent = '';
                row.appendChild(spacer);

                const icon = document.createElement('span');
                icon.className = 'tree-icon';
                icon.textContent = '📄';
                row.appendChild(icon);

                const label = document.createElement('span');
                label.className = 'tree-label';
                label.textContent = item.name;
                row.appendChild(label);

                // Delete button on hover
                const delBtn = document.createElement('button');
                delBtn.className = 'tree-del-btn';
                delBtn.title = 'Excluir prontuário';
                delBtn.innerHTML = '🗑️';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Deseja excluir "${item.name}"?`)) {
                        fileSystem = fileSystem.filter((i) => i.id !== item.id);
                        if (activeFileId === item.id) {
                            const remaining = fileSystem.find((i) => i.type === 'file');
                            activeFileId = remaining ? remaining.id : '';
                            loadActiveContent();
                        }
                        saveFileSystem();
                        renderTree();
                        showToast('Arquivo excluído.');
                    }
                });
                row.appendChild(delBtn);

                row.addEventListener('click', () => {
                    if (activeFileId !== item.id) {
                        activeFileId = item.id;
                        saveFileSystem();
                        loadActiveContent();
                        renderTree();
                    }
                });
            }

            treeContainer.appendChild(row);

            if (item.type === 'folder' && item.expanded) {
                renderItems(item.id, depth + 1);
            }
        }
    }

    renderItems(null, 0);
}

renderTree();

// ---------- Header & Actions ----------

// Toggle Sidebar
const btnToggleSidebar = document.getElementById('toggle-sidebar');
const sidebar = document.getElementById('sidebar');
btnToggleSidebar?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
});

// New File Button
const btnNewFile = document.getElementById('btn-new-file');
btnNewFile?.addEventListener('click', () => {
    const fileName = prompt('Nome do novo prontuário (ex: Paciente_Nome.md):', 'Novo_Prontuario.md');
    if (!fileName || !fileName.trim()) return;

    let targetFolder = 'folder-prontuarios';
    const active = getActiveFile();
    if (active && active.parentId) targetFolder = active.parentId;

    const newId = `file-${Date.now()}`;
    const newName = fileName.endsWith('.md') ? fileName.trim() : `${fileName.trim()}.md`;

    fileSystem.push({
        id: newId,
        name: newName,
        type: 'file',
        parentId: targetFolder,
        content: `# ${newName.replace(/\.md$/, '')}\n\n**Data:** ${new Date().toISOString().slice(0, 10)}\n\n`,
    });

    activeFileId = newId;
    saveFileSystem();
    loadActiveContent();
    renderTree();
    showToast(`Prontuário "${newName}" criado!`);
});

// New Folder Button
const btnNewFolder = document.getElementById('btn-new-folder');
btnNewFolder?.addEventListener('click', () => {
    const folderName = prompt('Nome da nova pasta:', 'Nova_Especialidade');
    if (!folderName || !folderName.trim()) return;

    let targetFolder: string | null = 'folder-prontuarios';
    const newId = `folder-${Date.now()}`;

    fileSystem.push({
        id: newId,
        name: folderName.trim(),
        type: 'folder',
        parentId: targetFolder,
        expanded: true,
    });

    saveFileSystem();
    renderTree();
    showToast(`Pasta "${folderName.trim()}" criada!`);
});

// Reset Demo Button
const btnResetDemo = document.getElementById('btn-reset-demo');
btnResetDemo?.addEventListener('click', () => {
    if (confirm('Deseja restaurar todas as pastas e prontuários de exemplo?')) {
        fileSystem = JSON.parse(JSON.stringify(INITIAL_FILE_SYSTEM));
        activeFileId = 'file-anamnese-cardio';
        saveFileSystem();
        loadActiveContent();
        renderTree();
        showToast('Exemplos clínicos restaurados!');
    }
});

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
