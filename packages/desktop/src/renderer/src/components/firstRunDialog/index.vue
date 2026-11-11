<template>
  <el-dialog
    v-model="visible"
    :title="t('firstRun.title')"
    width="520px"
    :close-on-click-modal="false"
    custom-class="ag-dialog-table markmed-dialog"
  >
    <div class="first-run-body">
      <p class="first-run-desc">
        {{ t('firstRun.description') }}
      </p>

      <div class="first-run-field">
        <span class="field-label">{{ t('firstRun.baseDirLabel') }}</span>
        <div class="base-dir-row">
          <el-input
            v-model="baseDir"
            size="small"
            readonly
          />
          <el-button
            size="small"
            @click="chooseDirectory"
          >
            {{ t('firstRun.chooseFolder') }}
          </el-button>
        </div>
      </div>

      <div class="first-run-preview">
        <div>
          <strong>{{ configDirName }}</strong> — {{ t('firstRun.configHint') }}
        </div>
        <div>
          <strong>{{ imagesDirName }}</strong> — {{ t('firstRun.imagesHint') }}
        </div>
      </div>

      <p class="first-run-hidden-note">
        {{ t('firstRun.hiddenNote') }}
      </p>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />

      <div class="first-run-wiki-row">
        <button
          type="button"
          class="plain-button wiki-link-btn"
          @click="openWikiGuide"
        >
          {{ t('firstRun.openWikiGuide') }}
        </button>
      </div>
    </div>

    <template #footer>
      <div class="first-run-footer">
        <el-button
          :disabled="creating"
          @click="handleSkip"
        >
          {{ t('firstRun.doLater') }}
        </el-button>
        <el-button
          type="primary"
          :loading="creating"
          @click="handleCreate"
        >
          {{ t('firstRun.createAutomatically') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import bus from '@/bus'
import notice from '@/services/notification'
import { HIDDEN_CONFIG_DIR_NAME, HIDDEN_IMAGES_DIR_NAME, WIKI_SETUP_URL } from './constants'

const { t } = useI18n()

const visible = ref(false)
const creating = ref(false)
const baseDir = ref('')
const configDirName = ref(HIDDEN_CONFIG_DIR_NAME)
const imagesDirName = ref(HIDDEN_IMAGES_DIR_NAME)
const wikiUrl = ref(WIKI_SETUP_URL)
const errorMessage = ref('')

let stopShowListener: (() => void) | undefined

const loadInitialStatus = async (forceOpen: boolean): Promise<void> => {
  try {
    const status = await window.electron.ipcRenderer.invoke('mt::setup::get-initial-status')
    baseDir.value = status.suggestedBaseDir
    configDirName.value = status.configDirName
    imagesDirName.value = status.imagesDirName
    wikiUrl.value = status.wikiUrl
    if (forceOpen || status.needsSetup) {
      errorMessage.value = ''
      visible.value = true
      bus.emit('editor-blur')
    }
  } catch (err) {
    console.error('Failed to read initial setup status:', err)
  }
}

const chooseDirectory = async (): Promise<void> => {
  const picked = await window.electron.ipcRenderer.invoke('mt::setup::pick-base-directory')
  if (picked) {
    baseDir.value = picked
  }
}

const openWikiGuide = (): void => {
  void window.electron.shell.openExternal(wikiUrl.value)
}

const handleSkip = async (): Promise<void> => {
  try {
    await window.electron.ipcRenderer.invoke('mt::setup::skip-setup')
  } finally {
    visible.value = false
  }
}

const handleCreate = async (): Promise<void> => {
  if (!baseDir.value || creating.value) return
  creating.value = true
  errorMessage.value = ''
  try {
    const result = await window.electron.ipcRenderer.invoke(
      'mt::setup::create-hidden-folders',
      baseDir.value
    )
    if (!result.ok) {
      errorMessage.value = result.error ?? t('firstRun.createFailed')
      return
    }
    visible.value = false
    void notice.notify({
      title: t('firstRun.createdTitle'),
      message: result.requiresRestart
        ? t('firstRun.createdAndRestarting')
        : t('firstRun.createdMessage', { dir: baseDir.value }),
      type: 'info',
      showConfirm: false
    })
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  stopShowListener = window.electron.ipcRenderer.on('mt::show-first-run-dialog', () => {
    void loadInitialStatus(true)
  })
  void loadInitialStatus(false)
})

onUnmounted(() => {
  stopShowListener?.()
})
</script>

<style scoped>
.first-run-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--editorColor);
}
.first-run-desc {
  margin: 0;
}
.first-run-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-weight: 600;
  font-size: 12px;
}
.base-dir-row {
  display: flex;
  gap: 8px;
}
.first-run-preview {
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--editorColor04);
  border: 1px solid var(--editorColor10);
  color: var(--editorColor80);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.first-run-hidden-note {
  margin: 0;
  font-size: 12px;
  opacity: 0.85;
}
.first-run-wiki-row {
  display: flex;
  justify-content: flex-start;
}
.wiki-link-btn {
  color: var(--themeColor);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}
.first-run-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
