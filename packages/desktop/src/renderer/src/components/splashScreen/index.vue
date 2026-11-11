<template>
  <div
    v-if="visible"
    class="markmed-splash"
    :class="{ 'is-leaving': leaving }"
    role="status"
    aria-label="MarkMed"
    @click="dismiss"
  >
    <div class="splash-content">
      <div
        class="splash-logo-stage"
        aria-label="MarkMed"
      >
        <div class="splash-badge" />
        <svg
          class="splash-ring"
          viewBox="0 0 140 140"
          aria-hidden="true"
        >
          <circle
            class="splash-ring-track"
            cx="70"
            cy="70"
            r="65"
          />
          <circle
            class="splash-ring-stroke"
            cx="70"
            cy="70"
            r="65"
          />
        </svg>

        <img
          class="splash-layer splash-layer--cross-left"
          :src="crossLeftLayer"
          alt=""
        >
        <img
          class="splash-layer splash-layer--cross-right"
          :src="crossRightLayer"
          alt=""
        >
        <img
          class="splash-layer splash-layer--staff splash-logo"
          :src="caduceusStaffLayer"
          alt="MarkMed"
        >
        <img
          class="splash-layer splash-layer--wing-left"
          :src="wingLeftLayer"
          alt=""
        >
        <img
          class="splash-layer splash-layer--wing-right"
          :src="wingRightLayer"
          alt=""
        >
        <img
          class="splash-layer splash-layer--hashtag"
          :src="hashtagLayer"
          alt=""
        >
      </div>

      <h1 class="splash-title">
        Mark<span class="splash-title-accent">Med</span>
      </h1>
      <div
        v-if="appVersion"
        class="splash-version"
      >
        {{ appVersion }}
      </div>
      <div class="splash-progress-track">
        <div class="splash-progress-bar" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMainStore } from '@/store'
import crossLeftLayer from '../../assets/images/splash/cross-left.png'
import crossRightLayer from '../../assets/images/splash/cross-right.png'
import caduceusStaffLayer from '../../assets/images/splash/caduceus-staff.png'
import wingLeftLayer from '../../assets/images/splash/wing-left.png'
import wingRightLayer from '../../assets/images/splash/wing-right.png'
import hashtagLayer from '../../assets/images/splash/hashtag.png'

const SPLASH_DISPLAY_MS = 3200
const SPLASH_FADE_MS = 450

const props = withDefaults(
  defineProps<{
    displayMs?: number
    fadeMs?: number
  }>(),
  {
    displayMs: SPLASH_DISPLAY_MS,
    fadeMs: SPLASH_FADE_MS
  }
)

const shouldShowSplash = (): boolean => {
  if (window.electron?.process?.env?.MARKTEXT_NO_SPLASH === '1') {
    return false
  }
  const windowId = window.marktext?.env?.windowId
  return windowId === undefined || windowId === 1
}

const mainStore = useMainStore()
const appVersion = computed(() => mainStore.appVersion)

const visible = ref(shouldShowSplash())
const leaving = ref(false)

let displayTimer: ReturnType<typeof setTimeout> | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null

const clearTimers = (): void => {
  if (displayTimer) {
    clearTimeout(displayTimer)
    displayTimer = null
  }
  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }
}

const dismiss = (): void => {
  if (!visible.value || leaving.value) return
  clearTimers()
  leaving.value = true
  fadeTimer = setTimeout(() => {
    visible.value = false
  }, props.fadeMs)
}

const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
    dismiss()
  }
}

onMounted(() => {
  if (!visible.value) return
  window.addEventListener('keydown', handleKeyDown)
  displayTimer = setTimeout(() => {
    dismiss()
  }, props.displayMs)
})

onBeforeUnmount(() => {
  clearTimers()
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.markmed-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--editorBgColor, #1a1e24);
  color: var(--editorColor, #e6edf3);
  user-select: none;
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
}

.markmed-splash.is-leaving {
  opacity: 0;
  transform: scale(1.02);
  pointer-events: none;
}

.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.splash-logo-stage {
  position: relative;
  width: 148px;
  height: 148px;
  filter: drop-shadow(0 12px 28px rgba(63, 167, 146, 0.24));
  animation: splash-stage-complete 0.55s ease-out 2.25s both;
}

.splash-badge {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: #1a1e24;
  animation: splash-badge-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.splash-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.splash-ring-track {
  fill: none;
  stroke: rgba(63, 167, 146, 0.16);
  stroke-width: 2.5;
}

.splash-ring-stroke {
  fill: none;
  stroke: #3fa792;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 409;
  stroke-dashoffset: 409;
  animation: splash-ring-draw 0.85s cubic-bezier(0.4, 0, 0.2, 1) 0.05s forwards;
}

.splash-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.splash-layer--cross-left {
  animation: splash-cross-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
}

.splash-layer--cross-right {
  animation: splash-cross-right 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
}

.splash-layer--staff {
  animation: splash-staff-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.9s both;
}

.splash-layer--wing-left {
  transform-origin: 49% 25%;
  animation: splash-wing-left 0.55s cubic-bezier(0.22, 1, 0.36, 1) 1.3s both;
}

.splash-layer--wing-right {
  transform-origin: 51% 25%;
  animation: splash-wing-right 0.55s cubic-bezier(0.22, 1, 0.36, 1) 1.3s both;
}

.splash-layer--hashtag {
  transform-origin: 62% 58%;
  animation: splash-hashtag-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) 1.65s both;
}

.splash-title {
  margin: 4px 0 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.1;
  color: var(--editorColor, #e6edf3);
  animation: splash-text-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.95s both;
}

.splash-title-accent {
  color: #3fa792;
}

.splash-version {
  font-size: 12px;
  letter-spacing: 0.08em;
  opacity: 0.65;
  animation: splash-text-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) 2.1s both;
}

.splash-progress-track {
  width: 156px;
  height: 3px;
  margin-top: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.22);
}

.splash-progress-bar {
  height: 100%;
  width: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3fa792, #63c7b2);
  transform-origin: left center;
  animation: splash-progress 3.1s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}

@keyframes splash-badge-in {
  from {
    opacity: 0;
    transform: scale(0.82);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes splash-ring-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes splash-cross-left {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
}

@keyframes splash-cross-right {
  from {
    opacity: 0;
    clip-path: inset(0 0 0 100%);
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
}

@keyframes splash-staff-rise {
  from {
    opacity: 0;
    clip-path: inset(100% 0 0 0);
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translateY(0);
  }
}

@keyframes splash-wing-left {
  from {
    opacity: 0;
    transform: scaleX(0.15) scaleY(0.75) translateX(8px);
  }
  to {
    opacity: 1;
    transform: scaleX(1) scaleY(1) translateX(0);
  }
}

@keyframes splash-wing-right {
  from {
    opacity: 0;
    transform: scaleX(0.15) scaleY(0.75) translateX(-8px);
  }
  to {
    opacity: 1;
    transform: scaleX(1) scaleY(1) translateX(0);
  }
}

@keyframes splash-hashtag-pop {
  from {
    opacity: 0;
    clip-path: inset(100% 0 0 0);
    transform: scale(0.72);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: scale(1);
  }
}

@keyframes splash-text-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes splash-stage-complete {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes splash-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
</style>
