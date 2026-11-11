<template>
  <div
    v-if="showStorageBar && spaceInfo"
    class="storage-bar"
    :class="{
      'is-low': spaceInfo.isLowSpace && !spaceInfo.isCriticalSpace,
      'is-critical': spaceInfo.isCriticalSpace
    }"
  >
    <div class="storage-left">
      <span
        class="storage-label"
        :title="spaceInfo.targetPath"
      >
        {{ t('storageBar.driveLabel') }}:
      </span>
      <div
        class="storage-track"
        role="progressbar"
        :aria-valuenow="spaceInfo.usedPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="storage-fill"
          :style="{ width: `${spaceInfo.usedPercent}%` }"
        />
      </div>
      <span class="storage-stats">
        {{
          t('storageBar.summary', {
            percent: spaceInfo.usedPercent,
            free: formatBytes(spaceInfo.freeBytes),
            total: formatBytes(spaceInfo.totalBytes)
          })
        }}
      </span>
    </div>

    <div class="storage-actions">
      <button
        type="button"
        class="plain-button storage-action-btn"
        :title="t('storageBar.refresh')"
        :aria-label="t('storageBar.refresh')"
        @click="refreshSpace(false)"
      >
        ↻
      </button>
      <button
        type="button"
        class="plain-button storage-action-btn"
        :title="t('storageBar.hideTooltip')"
        :aria-label="t('storageBar.hideTooltip')"
        @click="hideBar"
      >
        {{ t('storageBar.hide') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePreferencesStore } from '@/store/preferences'
import { useProjectStore } from '@/store/project'
import notice from '@/services/notification'
import type { StorageSpaceInfo } from '@shared/types/markmed'

const { t } = useI18n()
const preferencesStore = usePreferencesStore()
const projectStore = useProjectStore()

const { showStorageBar } = storeToRefs(preferencesStore)
const { availableRoots } = storeToRefs(projectStore)

const spaceInfo = ref<StorageSpaceInfo | null>(null)
let hasShownStartupWarning = false
let refreshTimer: ReturnType<typeof setInterval> | null = null

const primaryTargetPath = computed(() => {
  return availableRoots.value[0]?.pathname ?? ''
})

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  const gib = 1024 * 1024 * 1024
  if (bytes >= gib) {
    return `${(bytes / gib).toFixed(1).replace('.', ',')} GB`
  }
  const mib = 1024 * 1024
  return `${Math.round(bytes / mib)} MB`
}

const refreshSpace = async (allowStartupAlert: boolean): Promise<void> => {
  try {
    const info = await window.electron.ipcRenderer.invoke(
      'mt::storage::get-space-info',
      primaryTargetPath.value || undefined
    )
    spaceInfo.value = info
    if (allowStartupAlert && !hasShownStartupWarning && info?.isLowSpace) {
      hasShownStartupWarning = true
      void notice.notify({
        title: t('storageBar.lowSpaceTitle'),
        message: t('storageBar.lowSpaceMessage', {
          free: formatBytes(info.freeBytes),
          percent: info.usedPercent
        }),
        type: info.isCriticalSpace ? 'error' : 'warning',
        time: 12000,
        showConfirm: false
      })
    }
  } catch (err) {
    console.error('Failed to query storage space:', err)
  }
}

const hideBar = (): void => {
  preferencesStore.SET_SINGLE_PREFERENCE({ type: 'showStorageBar', value: false })
}

watch(primaryTargetPath, () => {
  void refreshSpace(false)
})

onMounted(() => {
  void refreshSpace(true)
  refreshTimer = setInterval(() => {
    void refreshSpace(false)
  }, 60000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
.storage-bar {
  height: 24px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  color: var(--editorColor80);
  background: var(--sideBarBgColor);
  border-top: 1px solid var(--editorColor10);
  user-select: none;
  z-index: 5;
}
.storage-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.storage-label {
  font-weight: 600;
  color: var(--editorColor80);
  white-space: nowrap;
}
.storage-track {
  width: 96px;
  height: 6px;
  border-radius: 999px;
  background: var(--editorColor10);
  overflow: hidden;
  flex-shrink: 0;
}
.storage-fill {
  height: 100%;
  background: var(--themeColor);
  transition: width 0.25s ease;
}
.storage-bar.is-low .storage-fill {
  background: #d9822b;
}
.storage-bar.is-critical .storage-fill {
  background: #d94343;
}
.storage-bar.is-low .storage-stats,
.storage-bar.is-critical .storage-stats {
  font-weight: 600;
}
.storage-stats {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.storage-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.storage-action-btn {
  font-size: 11px;
  color: var(--editorColor);
  opacity: 0.75;
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;
}
.storage-action-btn:hover {
  opacity: 1;
  background: var(--itemBgColor);
}
</style>
