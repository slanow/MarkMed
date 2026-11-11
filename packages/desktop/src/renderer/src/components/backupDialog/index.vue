<template>
  <el-dialog
    v-model="visible"
    :title="t('backup.title')"
    width="540px"
    custom-class="ag-dialog-table markmed-dialog"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane
        :label="t('backup.createTab')"
        name="backup"
      >
        <div class="backup-form">
          <div class="backup-field">
            <span class="field-label">{{ t('backup.sourceFolderLabel') }}</span>
            <div class="folder-picker-row">
              <el-input
                v-model="sourceFolder"
                size="small"
                readonly
                :placeholder="t('backup.noFolderSelected')"
              />
              <el-button
                size="small"
                @click="pickSourceFolder"
              >
                {{ t('backup.chooseFolder') }}
              </el-button>
            </div>
          </div>

          <div class="backup-checks">
            <el-checkbox v-model="includeImagesFolder">
              {{ t('backup.includeImages') }}
            </el-checkbox>
            <el-checkbox v-model="includeConfigFolder">
              {{ t('backup.includeConfig') }}
            </el-checkbox>
          </div>

          <div class="backup-field">
            <span class="field-label">{{ t('backup.passwordLabel') }}</span>
            <el-input
              v-model="backupPassword"
              type="password"
              show-password
              size="small"
              :placeholder="t('backup.passwordPlaceholder')"
            />
          </div>

          <div class="backup-field">
            <span class="field-label">{{ t('backup.confirmPasswordLabel') }}</span>
            <el-input
              v-model="backupPasswordConfirm"
              type="password"
              show-password
              size="small"
              :placeholder="t('backup.confirmPasswordPlaceholder')"
            />
          </div>

          <el-alert
            v-if="backupFeedback"
            :title="backupFeedback.message"
            :type="backupFeedback.type"
            :closable="false"
            show-icon
          />

          <div class="tab-actions">
            <el-button
              type="primary"
              :loading="working"
              @click="handleCreateBackup"
            >
              {{ t('backup.createAction') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane
        :label="t('backup.decryptTab')"
        name="decrypt"
      >
        <div class="backup-form">
          <div class="backup-field">
            <span class="field-label">{{ t('backup.archiveFileLabel') }}</span>
            <div class="folder-picker-row">
              <el-input
                v-model="archiveFilePath"
                size="small"
                readonly
                :placeholder="t('backup.archivePlaceholder')"
              />
              <el-button
                size="small"
                @click="pickArchiveFile"
              >
                {{ t('backup.chooseFile') }}
              </el-button>
            </div>
          </div>

          <div class="backup-field">
            <span class="field-label">{{ t('backup.destinationFolderLabel') }}</span>
            <div class="folder-picker-row">
              <el-input
                v-model="restoreDestinationDir"
                size="small"
                readonly
                :placeholder="t('backup.destinationPlaceholder')"
              />
              <el-button
                size="small"
                @click="pickRestoreFolder"
              >
                {{ t('backup.chooseFolder') }}
              </el-button>
            </div>
          </div>

          <div class="backup-field">
            <span class="field-label">{{ t('backup.passwordLabel') }}</span>
            <el-input
              v-model="decryptPassword"
              type="password"
              show-password
              size="small"
              :placeholder="t('backup.decryptPasswordPlaceholder')"
            />
          </div>

          <el-alert
            v-if="decryptFeedback"
            :title="decryptFeedback.message"
            :type="decryptFeedback.type"
            :closable="false"
            show-icon
          />

          <div class="tab-actions">
            <el-button
              v-if="lastRestoredDir"
              @click="openRestoredFolder"
            >
              {{ t('backup.openRestoredFolder') }}
            </el-button>
            <el-button
              type="primary"
              :loading="working"
              @click="handleDecryptBackup"
            >
              {{ t('backup.decryptAction') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import bus from '@/bus'
import { useProjectStore } from '@/store/project'

interface FeedbackState {
  type: 'success' | 'error'
  message: string
}

const { t } = useI18n()
const projectStore = useProjectStore()

const visible = ref(false)
const activeTab = ref<'backup' | 'decrypt'>('backup')
const working = ref(false)

const sourceFolder = ref('')
const includeImagesFolder = ref(true)
const includeConfigFolder = ref(false)
const backupPassword = ref('')
const backupPasswordConfirm = ref('')
const backupFeedback = ref<FeedbackState | null>(null)

const archiveFilePath = ref('')
const restoreDestinationDir = ref('')
const decryptPassword = ref('')
const decryptFeedback = ref<FeedbackState | null>(null)
const lastRestoredDir = ref('')

let stopIpcListener: (() => void) | undefined

const openDialog = (tab: 'backup' | 'decrypt' = 'backup'): void => {
  activeTab.value = tab
  backupFeedback.value = null
  decryptFeedback.value = null
  lastRestoredDir.value = ''
  if (!sourceFolder.value && projectStore.availableRoots.length > 0) {
    sourceFolder.value = projectStore.availableRoots[0].pathname
  }
  visible.value = true
  bus.emit('editor-blur')
}

const handleBusOpen = (tab: unknown): void => {
  openDialog(tab === 'decrypt' ? 'decrypt' : 'backup')
}

const pickSourceFolder = async (): Promise<void> => {
  const picked = await window.electron.ipcRenderer.invoke('mt::backup::pick-source-folder')
  if (picked) sourceFolder.value = picked
}

const pickArchiveFile = async (): Promise<void> => {
  const picked = await window.electron.ipcRenderer.invoke('mt::backup::pick-archive-file')
  if (picked) archiveFilePath.value = picked
}

const pickRestoreFolder = async (): Promise<void> => {
  const picked = await window.electron.ipcRenderer.invoke('mt::backup::pick-restore-folder')
  if (picked) restoreDestinationDir.value = picked
}

const handleCreateBackup = async (): Promise<void> => {
  backupFeedback.value = null
  if (!backupPassword.value) {
    backupFeedback.value = { type: 'error', message: t('backup.errorEmptyPassword') }
    return
  }
  if (backupPassword.value !== backupPasswordConfirm.value) {
    backupFeedback.value = { type: 'error', message: t('backup.errorPasswordMismatch') }
    return
  }

  working.value = true
  try {
    const result = await window.electron.ipcRenderer.invoke('mt::backup::create', {
      sourceDirs: sourceFolder.value ? [sourceFolder.value] : [],
      includeImagesFolder: includeImagesFolder.value,
      includeConfigFolder: includeConfigFolder.value,
      password: backupPassword.value
    })
    if (result.canceled) return
    if (!result.ok) {
      backupFeedback.value = {
        type: 'error',
        message: result.error ?? t('backup.errorGeneric')
      }
      return
    }
    backupFeedback.value = {
      type: 'success',
      message: t('backup.createSuccess', {
        count: result.fileCount ?? 0,
        path: result.archivePath ?? ''
      })
    }
    backupPassword.value = ''
    backupPasswordConfirm.value = ''
  } finally {
    working.value = false
  }
}

const handleDecryptBackup = async (): Promise<void> => {
  decryptFeedback.value = null
  lastRestoredDir.value = ''
  if (!archiveFilePath.value) {
    decryptFeedback.value = { type: 'error', message: t('backup.errorNoArchive') }
    return
  }
  if (!restoreDestinationDir.value) {
    decryptFeedback.value = { type: 'error', message: t('backup.errorNoDestination') }
    return
  }
  if (!decryptPassword.value) {
    decryptFeedback.value = { type: 'error', message: t('backup.errorEmptyPassword') }
    return
  }

  working.value = true
  try {
    const result = await window.electron.ipcRenderer.invoke('mt::backup::decrypt', {
      archivePath: archiveFilePath.value,
      destinationDir: restoreDestinationDir.value,
      password: decryptPassword.value
    })
    if (!result.ok) {
      decryptFeedback.value = {
        type: 'error',
        message: result.error ?? t('backup.errorGeneric')
      }
      return
    }
    lastRestoredDir.value = result.restoredDir ?? ''
    decryptFeedback.value = {
      type: 'success',
      message: t('backup.decryptSuccess', {
        count: result.fileCount ?? 0,
        dir: result.restoredDir ?? ''
      })
    }
    decryptPassword.value = ''
  } finally {
    working.value = false
  }
}

const openRestoredFolder = (): void => {
  if (!lastRestoredDir.value) return
  void window.electron.shell.openPath(lastRestoredDir.value)
}

onMounted(() => {
  bus.on('backupDialog', handleBusOpen)
  stopIpcListener = window.electron.ipcRenderer.on('mt::show-backup-dialog', (_e, tab) => {
    openDialog(tab)
  })
})

onUnmounted(() => {
  bus.off('backupDialog', handleBusOpen)
  stopIpcListener?.()
})
</script>

<style scoped>
.backup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  color: var(--editorColor);
}
.backup-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
}
.folder-picker-row {
  display: flex;
  gap: 8px;
}
.backup-checks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tab-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
