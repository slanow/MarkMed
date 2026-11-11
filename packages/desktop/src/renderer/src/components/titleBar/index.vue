<template>
  <div>
    <div
      class="title-bar-editor-bg"
      :class="{ 'tabs-visible': showTabBar }"
    />
    <div
      class="title-bar"
      :class="[
        { active: active },
        { 'tabs-visible': showTabBar },
        { frameless: titleBarStyle === 'custom' },
        { isOsx: isOsx }
      ]"
    >
      <div :class="showCustomTitleBar ? 'left-toolbar title-no-drag' : 'right-toolbar'">
        <img
          v-if="showCustomTitleBar"
          class="titlebar-logo"
          :src="MarkMedLogo"
          alt="MarkMed"
        >
        <button
          v-if="showCustomTitleBar"
          type="button"
          class="plain-button frameless-titlebar-menu title-no-drag"
          aria-haspopup="menu"
          :aria-label="t('titleBar.applicationMenu')"
          @click.stop="handleMenuClick"
        >
          <svg
            class="frameless-titlebar-menu-icon"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <line
              x1="2"
              y1="4"
              x2="14"
              y2="4"
            />
            <line
              x1="2"
              y1="8"
              x2="14"
              y2="8"
            />
            <line
              x1="2"
              y1="12"
              x2="14"
              y2="12"
            />
          </svg>
        </button>
        <icon-tooltip :content="showSideBar ? t('titleBar.hideSidebar') : t('titleBar.showSidebar')">
          <button
            type="button"
            class="plain-button titlebar-pill-btn titlebar-sidebar-btn title-no-drag"
            :class="{ 'is-active': showSideBar }"
            :aria-label="showSideBar ? t('titleBar.hideSidebar') : t('titleBar.showSidebar')"
            @click.stop="toggleSideBar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="1.5"
                y="2.5"
                width="13"
                height="11"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.3"
              />
              <line
                x1="6"
                y1="2.5"
                x2="6"
                y2="13.5"
                stroke="currentColor"
                stroke-width="1.3"
              />
            </svg>
          </button>
        </icon-tooltip>
        <document-statistics
          v-if="wordCount"
          :pathname="pathname"
          :word-count="wordCount"
          :selection-word-count="selectionWordCount"
          :is-saved="isSaved"
          :read-only="!!currentFile?.readOnly"
          :mode-changing="!!currentFile?.modeChanging"
          @toggle-reading="setReadingMode"
        />
      </div>
      <div
        v-if="titleBarStyle !== 'native' || isOsx"
        class="title"
        @dblclick.stop="toggleMaxmizeOnMacOS"
      >
        <span v-if="!filename">MarkMed</span>
        <span
          v-else
          class="title-filename-wrap"
          :title="filename"
        >
          <span
            class="save-dot"
            :class="{ show: !isSaved }"
          />
          <span
            class="filename"
            :class="{ isOsx: platform === 'darwin' }"
            @click="rename"
          >
            {{ filename }}
          </span>
        </span>
      </div>
      <div class="right-cluster title-no-drag">
        <div class="titlebar-quick-actions">
          <el-popover
            trigger="click"
            placement="bottom-end"
            :width="270"
            :show-arrow="false"
            popper-class="autosave-quick-popover"
          >
            <template #reference>
              <button
                type="button"
                class="plain-button titlebar-pill-btn"
                :class="{ 'is-active': autoSave || autoSaveOnEnter }"
                :aria-label="t('titleBar.autoSaveButton')"
              >
                <span class="pill-dot" />
                <span>{{ autoSaveBadgeText }}</span>
              </button>
            </template>
            <div class="autosave-popover-body">
              <div class="autosave-row">
                <span class="autosave-row-label">{{ t('titleBar.autoSaveByTime') }}</span>
                <el-switch
                  :model-value="autoSave"
                  size="small"
                  @change="(val: boolean | string | number) => setAutoSave(Boolean(val))"
                />
              </div>
              <div class="autosave-presets">
                <button
                  v-for="sec in autoSavePresets"
                  :key="sec"
                  type="button"
                  class="plain-button autosave-preset-btn"
                  :class="{ 'is-selected': autoSave && autoSaveDelay === sec * 1000 }"
                  @click="selectAutoSaveInterval(sec * 1000)"
                >
                  {{ sec }}s
                </button>
              </div>
              <div class="autosave-divider" />
              <div class="autosave-row">
                <span class="autosave-row-label">{{ t('titleBar.autoSaveOnEnter') }}</span>
                <el-switch
                  :model-value="autoSaveOnEnter"
                  size="small"
                  @change="(val: boolean | string | number) => setAutoSaveOnEnter(Boolean(val))"
                />
              </div>
            </div>
          </el-popover>

          <icon-tooltip
            v-if="hasCurrentFile"
            :content="t('titleBar.copyPlainTextTooltip')"
          >
            <button
              type="button"
              class="plain-button titlebar-pill-btn titlebar-copy-txt-btn"
              :class="{ 'is-copied': copiedPlainText }"
              :aria-label="t('titleBar.copyPlainTextTooltip')"
              @click.stop="handleCopyPlainTextClick"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="2"
                  width="9"
                  height="11"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.3"
                />
                <path
                  d="M3 5H2.5A1.5 1.5 0 0 0 1 6.5v7A1.5 1.5 0 0 0 2.5 15h7A1.5 1.5 0 0 0 11 13.5V13"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </svg>
              <span>{{ copiedPlainText ? t('titleBar.copiedPlainText') : t('titleBar.copyPlainText') }}</span>
            </button>
          </icon-tooltip>
        </div>

        <div
          v-if="titleBarStyle === 'custom' && !isFullScreen && !isOsx"
          class="window-controls-group"
        >
          <icon-tooltip :content="t('titleBar.minimize')">
            <button
              type="button"
              class="plain-button frameless-titlebar-button frameless-titlebar-minimize"
              :aria-label="t('titleBar.minimize')"
              @click.stop="handleMinimizeClick"
            >
              <span>
                <svg
                  width="10"
                  height="10"
                >
                  <path :d="windowIconMinimize" />
                </svg>
              </span>
            </button>
          </icon-tooltip>
          <icon-tooltip :content="maximizeLabel">
            <button
              type="button"
              class="plain-button frameless-titlebar-button frameless-titlebar-toggle"
              :aria-label="maximizeLabel"
              @click.stop="handleMaximizeClick"
            >
              <span>
                <svg
                  width="10"
                  height="10"
                >
                  <path
                    v-show="!isMaximized"
                    :d="windowIconMaximize"
                  />
                  <path
                    v-show="isMaximized"
                    :d="windowIconRestore"
                  />
                </svg>
              </span>
            </button>
          </icon-tooltip>
          <icon-tooltip
            :content="t('titleBar.close')"
            placement="bottom-end"
          >
            <button
              type="button"
              class="plain-button frameless-titlebar-button frameless-titlebar-close"
              :aria-label="t('titleBar.close')"
              @click.stop="handleCloseClick"
            >
              <span>
                <svg
                  width="10"
                  height="10"
                >
                  <path :d="windowIconClose" />
                </svg>
              </span>
            </button>
          </icon-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePreferencesStore } from '@/store/preferences.js'
import { useLayoutStore } from '@/store/layout.js'
import bus from '@/bus'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { minimizePath, restorePath, maximizePath, closePath } from '../../assets/window-controls.js'
import { isMac as isOsxPlatform } from '@/util'
import { buildWindowTitle } from './windowTitle'
import { useEditorStore } from '@/store/editor'
import { useI18n } from 'vue-i18n'
import IconTooltip from '@/components/iconTooltip/index.vue'
import DocumentStatistics from './documentStatistics.vue'
import MarkMedLogo from '../../assets/images/logo.png'
import {
  copyTextToClipboard,
  getActiveEditorSelectionText,
  resolvePlainTextToCopy
} from '@/util/copyPlainText'
import type { FileWordCount } from '@shared/types/files'

interface ProjectInfo {
  name?: string
}

const props = defineProps<{
  project?: ProjectInfo | null
  filename?: string
  pathname?: string
  active?: boolean
  wordCount?: FileWordCount | null
  selectionWordCount?: FileWordCount | null
  platform?: string
  isSaved?: boolean
}>()

const preferencesStore = usePreferencesStore()
const layoutStore = useLayoutStore()
const editorStore = useEditorStore()
const { currentFile } = storeToRefs(editorStore)
const setReadingMode = (readOnly: boolean): void => {
  if (currentFile.value) void editorStore.SET_READ_ONLY(currentFile.value.id, readOnly)
}
const { t } = useI18n()

const isOsx = isOsxPlatform
const windowIconMinimize = minimizePath
const windowIconRestore = restorePath
const windowIconMaximize = maximizePath
const windowIconClose = closePath

const isFullScreen = ref(false)
const isMaximized = ref(false)

onMounted(async () => {
  try {
    const [fs, max] = await Promise.all([
      window.electron.windowControl.isFullScreen(),
      window.electron.windowControl.isMaximized()
    ])
    isFullScreen.value = !!fs
    isMaximized.value = !!max
  } catch {
    // Window state is best-effort; keep the previous values if the query fails.
  }
})

const { titleBarStyle, autoSave, autoSaveDelay, autoSaveOnEnter, sourceCode } =
  storeToRefs(preferencesStore)
const { showTabBar, showSideBar } = storeToRefs(layoutStore)

const toggleSideBar = (): void => {
  bus.emit('view:toggle-layout-entry', 'showSideBar')
}

const autoSavePresets = [1, 3, 5, 10, 30, 60] as const
const copiedPlainText = ref(false)
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null

const hasCurrentFile = computed(() => currentFile.value?.markdown !== undefined)

const autoSaveBadgeText = computed(() => {
  const base = t('titleBar.autoSaveButton')
  if (autoSave.value && autoSaveOnEnter.value) {
    return `${base} · ${Math.round(autoSaveDelay.value / 1000)}s+↵`
  }
  if (autoSave.value) {
    return `${base} · ${Math.round(autoSaveDelay.value / 1000)}s`
  }
  if (autoSaveOnEnter.value) {
    return `${base} · ↵`
  }
  return base
})

const setAutoSave = (enabled: boolean): void => {
  preferencesStore.SET_SINGLE_PREFERENCE({ type: 'autoSave', value: enabled })
}

const setAutoSaveOnEnter = (enabled: boolean): void => {
  preferencesStore.SET_SINGLE_PREFERENCE({ type: 'autoSaveOnEnter', value: enabled })
}

const selectAutoSaveInterval = (delayMs: number): void => {
  preferencesStore.SET_SINGLE_PREFERENCE({ type: 'autoSaveDelay', value: delayMs })
  if (!autoSave.value) {
    preferencesStore.SET_SINGLE_PREFERENCE({ type: 'autoSave', value: true })
  }
}

const handleCopyPlainTextClick = async (): Promise<void> => {
  const markdown = currentFile.value?.markdown ?? ''
  const selectedText = getActiveEditorSelectionText()
  const plain = resolvePlainTextToCopy({
    markdown,
    selectedText,
    isSourceCode: sourceCode.value && !currentFile.value?.readOnly
  })
  if (!plain) return
  await copyTextToClipboard(plain)
  copiedPlainText.value = true
  if (copiedResetTimer) clearTimeout(copiedResetTimer)
  copiedResetTimer = setTimeout(() => {
    copiedResetTimer = null
    copiedPlainText.value = false
  }, 1800)
}

const showCustomTitleBar = computed(() => {
  return titleBarStyle.value === 'custom' && !isOsx
})

const maximizeLabel = computed(() =>
  isMaximized.value ? t('titleBar.restore') : t('titleBar.maximize')
)

watch(
  () => [props.filename, props.project?.name] as const,
  ([filename, projectName]) => {
    document.title = buildWindowTitle(filename, projectName ?? '', isOsx)
  },
  { immediate: true }
)

const handleCloseClick = () => {
  window.electron.windowControl.close()
}

const handleMaximizeClick = async () => {
  if (isFullScreen.value) {
    window.electron.windowControl.setFullScreen(false)
    return
  }
  if (isMaximized.value) window.electron.windowControl.unmaximize()
  else window.electron.windowControl.maximize()
}

const toggleMaxmizeOnMacOS = () => {
  if (isOsx) {
    handleMaximizeClick()
  }
}

const handleMinimizeClick = () => {
  window.electron.windowControl.minimize()
}

const handleMenuClick = (event: MouseEvent) => {
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect()
    window.electron.windowControl.popupApplicationMenu({
      x: Math.round(rect.left + 4),
      y: Math.round(rect.bottom + 2)
    })
    return
  }
  window.electron.windowControl.popupApplicationMenu({ x: 44, y: 26 })
}

const rename = () => {
  if (props.platform === 'darwin') {
    editorStore.RESPONSE_FOR_RENAME()
  }
}

const onMaximize = () => {
  isMaximized.value = true
}
const onUnmaximize = () => {
  isMaximized.value = false
}
const onEnterFullScreen = () => {
  isFullScreen.value = true
}
const onLeaveFullScreen = () => {
  isFullScreen.value = false
}

const offMaximize = window.electron.ipcRenderer.on('mt::window-maximize', onMaximize)
const offUnmaximize = window.electron.ipcRenderer.on('mt::window-unmaximize', onUnmaximize)
const offEnterFullScreen = window.electron.ipcRenderer.on(
  'mt::window-enter-full-screen',
  onEnterFullScreen
)
const offLeaveFullScreen = window.electron.ipcRenderer.on(
  'mt::window-leave-full-screen',
  onLeaveFullScreen
)

onBeforeUnmount(() => {
  if (copiedResetTimer) clearTimeout(copiedResetTimer)
  offMaximize()
  offUnmaximize()
  offEnterFullScreen()
  offLeaveFullScreen()
})
</script>

<style scoped>
.title-bar-editor-bg {
  height: var(--titleBarHeight);
  background: var(--editorBgColor);
  position: relative;
  left: 0;
  top: 0;
  right: 0;
}
.title-bar {
  -webkit-app-region: drag;
  user-select: none;
  background: transparent;
  height: var(--titleBarHeight);
  box-sizing: border-box;
  color: var(--editorColor50);
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  transition: color 0.4s ease-in-out;
  cursor: default;
}
.active {
  color: var(--editorColor);
}
img {
  height: 90%;
  margin-top: 1px;
  vertical-align: top;
}
.title {
  padding: 0 12px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  height: 100%;
  line-height: var(--titleBarHeight);
  font-size: 14px;
  text-align: center;
  transition: all 0.25s ease-in-out;
  & .filename {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: all 0.25s ease-in-out;
  }
  &::after {
    content: '';
    position: absolute;
    top: 0;
    height: 1px;
    width: 100%;
    z-index: 1;
    -webkit-app-region: no-drag;
  }
}
div.title > span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.title-bar .title .filename.isOsx:hover {
  color: var(--themeColor);
}

.active .save-dot {
  flex: none;
  margin-right: 0.25rem;
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
  background: var(--highlightThemeColor);
  opacity: 0.7;
  visibility: hidden;
}
.active .save-dot.show {
  visibility: visible;
}
.title:hover {
  color: var(sideBarTitleColor);
}

.left-toolbar {
  padding: 0 10px;
  height: 100%;
  justify-self: start;
  width: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.titlebar-logo {
  width: 20px;
  height: 20px;
  margin-top: 0;
  object-fit: contain;
  flex: none;
  pointer-events: none;
}
.right-toolbar {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 10px;
}
.right-cluster {
  grid-column: 3;
  justify-self: end;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}
.titlebar-quick-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 4px;
}
.titlebar-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1;
  color: var(--editorColor60);
  background: transparent;
  border: 1px solid var(--editorColor10);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}
.titlebar-pill-btn:hover {
  background: var(--sideBarBgColor);
  color: var(--editorColor);
}
.titlebar-pill-btn.is-active {
  color: #3fa792;
  border-color: rgba(63, 167, 146, 0.45);
}
.titlebar-pill-btn.is-copied {
  color: #3fa792;
  border-color: #3fa792;
  background: rgba(63, 167, 146, 0.12);
}
.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.75;
}
.window-controls-group {
  display: flex;
  align-items: center;
  width: 138px;
  height: 100%;
  flex-direction: row;
}

.title-no-drag {
  -webkit-app-region: no-drag;
}
.frameless-titlebar-button {
  position: relative;
  display: block;
  width: 46px;
  height: var(--titleBarHeight);
}
/* `.right-toolbar` lays its items out in reverse. The window controls are
   listed minimize → close and laid out forwards, so Tab moves left to right. */
.window-controls {
  width: 138px;
  flex-direction: row;
}
.frameless-titlebar-button > span {
  position: absolute;
  display: inline-flex;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
}
.frameless-titlebar-menu {
  color: var(--sideBarColor);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 4px;
  line-height: 1;
}
.frameless-titlebar-menu-icon {
  display: block;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}
.frameless-titlebar-close:hover {
  background-color: rgb(228, 79, 79);
}
.frameless-titlebar-minimize:hover,
.frameless-titlebar-toggle:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
.frameless-titlebar-button svg {
  fill: #000000;
}
.frameless-titlebar-close:hover svg {
  fill: #ffffff;
}

.text-center-vertical {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}
</style>

<style>
.autosave-quick-popover.el-popover.el-popper {
  padding: 12px 14px;
  border: 1px solid var(--floatBorderColor);
  border-radius: 10px;
  background: var(--floatBgColor);
  box-shadow: var(--floatShadow);
  color: var(--editorColor);
}
.autosave-popover-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.autosave-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.autosave-row-label {
  color: var(--editorColor);
}
.autosave-presets {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
}
.autosave-preset-btn {
  height: 24px;
  border-radius: 5px;
  border: 1px solid var(--editorColor10);
  background: transparent;
  color: var(--editorColor50);
  font-size: 11px;
  cursor: pointer;
}
.autosave-preset-btn:hover {
  color: var(--editorColor);
  border-color: var(--editorColor30);
}
.autosave-preset-btn.is-selected {
  color: #3fa792;
  border-color: #3fa792;
  background: rgba(63, 167, 146, 0.14);
  font-weight: 600;
}
.autosave-divider {
  height: 1px;
  background: var(--editorColor10);
}
</style>
