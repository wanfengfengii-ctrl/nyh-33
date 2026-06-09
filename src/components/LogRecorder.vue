<template>
  <div v-if="isRecording" class="recording-indicator">
    <span class="recording-dot"></span>
    <span>录制中</span>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { useAstrolabeStore } from '../stores/astrolabe'
import { useLogStore } from '../stores/log'
import { storeToRefs } from 'pinia'

const astrolabeStore = useAstrolabeStore()
const logStore = useLogStore()

const { isRecording } = storeToRefs(logStore)

const FRAME_INTERVAL = 100
let frameTimer: number | null = null

function captureFrame() {
  if (!logStore.isRecording) return
  const frameData = astrolabeStore.getCurrentFrameData()
  logStore.recordFrame(frameData)
}

function startFrameCapture() {
  if (frameTimer) return
  captureFrame()
  frameTimer = window.setInterval(() => {
    captureFrame()
  }, FRAME_INTERVAL)
}

function stopFrameCapture() {
  if (frameTimer) {
    clearInterval(frameTimer)
    frameTimer = null
  }
}

watch(
  () => logStore.isRecording,
  (recording) => {
    if (recording) {
      startFrameCapture()
    } else {
      stopFrameCapture()
    }
  }
)

onMounted(() => {
  if (logStore.isRecording) {
    startFrameCapture()
  }
})

onUnmounted(() => {
  stopFrameCapture()
})
</script>

<style scoped>
.recording-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(220, 48, 80, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 20;
  animation: pulse 1.5s ease-in-out infinite;
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: blink 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
