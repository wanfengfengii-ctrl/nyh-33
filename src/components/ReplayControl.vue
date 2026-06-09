<template>
  <div class="replay-panel" v-if="isReplayMode && currentReplayLog">
    <n-card :bordered="false" size="small">
      <div class="replay-header">
        <n-tag type="info" size="large">
          <n-icon size="14" style="margin-right: 4px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </n-icon>
          回放模式
        </n-tag>
        <n-button size="small" type="error" @click="onExitReplay">
          退出回放
        </n-button>
      </div>

      <div class="replay-title">
        {{ currentReplayLog.finalResult.bodyName }}观测
      </div>
      <div class="replay-subtitle">
        {{ new Date(currentReplayLog.startTime).toLocaleString('zh-CN') }}
      </div>

      <n-divider style="margin: 12px 0" />

      <div class="replay-info">
        <div class="info-row">
          <span class="info-label">模式</span>
          <n-tag :type="modeTagType" size="small">
            {{ currentReplayLog.mode === 'practice' ? '练习' : '考核' }}
          </n-tag>
        </div>
        <div class="info-row">
          <span class="info-label">当前步骤</span>
          <span class="info-value">{{ currentStepTitle }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">照准尺角度</span>
          <span class="info-value">{{ displayAlidadeAngle.toFixed(1) }}°</span>
        </div>
        <div class="info-row">
          <span class="info-label">测量高度</span>
          <span class="info-value">{{ displayMeasuredAltitude.toFixed(2) }}°</span>
        </div>
        <div class="info-row" v-if="canShowAnswer">
          <span class="info-label">真实高度</span>
          <span class="info-value">{{ displayTrueAltitude.toFixed(2) }}°</span>
        </div>
        <div class="info-row" v-if="canShowAnswer">
          <span class="info-label">误差</span>
          <span class="info-value" :class="errorClass">
            {{ displayError >= 0 ? '+' : '' }}{{ displayError.toFixed(2) }}°
          </span>
        </div>
      </div>

      <n-divider style="margin: 12px 0" />

      <div class="progress-section">
        <div class="progress-time">
          <span>{{ formatTime(replayTime) }}</span>
          <span>{{ formatTime(currentReplayLog.duration) }}</span>
        </div>
        <n-slider
          :value="replayProgress"
          :step="0.1"
          @update:value="onSeek"
          :tooltip="false"
        />
      </div>

      <div class="control-buttons">
        <n-button size="small" circle @click="onJumpStart">
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"></line>
            </svg>
          </template>
        </n-button>
        <n-button size="small" circle @click="onStepBackward">
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
            </svg>
          </template>
        </n-button>
        <n-button size="large" type="primary" circle @click="onTogglePlay">
          <template #icon>
            <svg v-if="!isReplayPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </template>
        </n-button>
        <n-button size="small" circle @click="onStepForward">
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
            </svg>
          </template>
        </n-button>
        <n-button size="small" circle @click="onJumpEnd">
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"></line>
            </svg>
          </template>
        </n-button>
      </div>

      <div class="speed-control">
        <span class="speed-label">倍速</span>
        <n-radio-group v-model:value="speedValue" size="small" @update:value="onSpeedChange">
          <n-radio-button value="0.5">0.5x</n-radio-button>
          <n-radio-button value="1">1x</n-radio-button>
          <n-radio-button value="2">2x</n-radio-button>
          <n-radio-button value="4">4x</n-radio-button>
        </n-radio-group>
      </div>

      <n-divider style="margin: 12px 0" />

      <div class="final-result" v-if="canShowAnswer">
        <n-space vertical align="center" style="width: 100%">
          <n-statistic
            :value="currentReplayLog.finalResult.score"
            label="最终得分"
            :value-style="{ fontSize: '28px' }"
          />
          <n-tag :type="scoreTagType" size="large">
            {{ currentReplayLog.finalResult.scoreGrade }}
          </n-tag>
        </n-space>
      </div>

      <div class="exam-lock" v-else-if="isExamMode && !isMeasurementComplete">
        <n-alert type="warning" :show-icon="true">
          <template #header>
            考核模式保密
          </template>
          回放进行中，测量完成前不显示正确答案
        </n-alert>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NCard,
  NTag,
  NButton,
  NDivider,
  NSpace,
  NSlider,
  NRadioGroup,
  NRadioButton,
  NStatistic,
  NAlert,
  NIcon,
} from 'naive-ui'
import { useLogStore } from '../stores/log'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
  (e: 'exit'): void
}>()

const logStore = useLogStore()

const {
  isReplayMode,
  currentReplayLog,
  currentReplayFrame,
  isReplayPlaying,
  replayProgress,
  replayTime,
  replaySpeed,
} = storeToRefs(logStore)

const speedValue = ref(1)

const isExamMode = computed(() => currentReplayLog.value?.mode === 'exam')

const isMeasurementComplete = computed(() => {
  return currentReplayFrame.value?.isMeasurementComplete || false
})

const canShowAnswer = computed(() => {
  if (!currentReplayLog.value) return false
  if (currentReplayLog.value.mode !== 'exam') return true
  return isMeasurementComplete.value
})

const modeTagType = computed(() => {
  return currentReplayLog.value?.mode === 'practice' ? 'success' : 'warning'
})

const currentStepTitle = computed(() => {
  if (!currentReplayLog.value || !currentReplayFrame.value) return ''
  const step = currentReplayLog.value.steps.find(
    (s) => s.id === currentReplayFrame.value!.currentStepId
  )
  return step?.title || ''
})

const displayAlidadeAngle = computed(() => {
  return currentReplayFrame.value?.alidadeAngle || 0
})

const displayMeasuredAltitude = computed(() => {
  return currentReplayFrame.value?.alidadeAngle || 0
})

const displayTrueAltitude = computed(() => {
  return currentReplayFrame.value?.bodyAltitude || 0
})

const displayError = computed(() => {
  if (!currentReplayFrame.value) return 0
  return currentReplayFrame.value.alidadeAngle - currentReplayFrame.value.bodyAltitude
})

const errorClass = computed(() => {
  const abs = Math.abs(displayError.value)
  if (abs <= 1) return 'excellent'
  if (abs <= 3) return 'good'
  if (abs <= 5) return 'warning'
  return 'error'
})

const scoreTagType = computed(() => {
  const score = currentReplayLog.value?.finalResult.score || 0
  if (score >= 90) return 'success'
  if (score >= 70) return 'info'
  if (score >= 60) return 'warning'
  return 'error'
})

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const msPart = Math.floor((ms % 1000) / 100)
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${msPart}`
}

function onTogglePlay() {
  logStore.toggleReplayPlay()
}

function onStepForward() {
  logStore.stepForward()
}

function onStepBackward() {
  logStore.stepBackward()
}

function onJumpStart() {
  logStore.jumpToStart()
}

function onJumpEnd() {
  logStore.jumpToEnd()
}

function onSeek(value: number) {
  logStore.seekReplay(value)
}

function onSpeedChange(value: string | number | null) {
  if (typeof value === 'string' || typeof value === 'number') {
    logStore.setReplaySpeed(Number(value))
  }
}

function onExitReplay() {
  logStore.stopReplay()
  emit('exit')
}

watch(
  () => replaySpeed.value,
  (speed) => {
    speedValue.value = speed
  }
)
</script>

<style scoped>
.replay-panel {
  width: 320px;
}

.replay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.replay-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.replay-subtitle {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.replay-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  color: #999;
  font-size: 13px;
}

.info-value {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.info-value.excellent {
  color: #18a058;
}

.info-value.good {
  color: #2080f0;
}

.info-value.warning {
  color: #f0a020;
}

.info-value.error {
  color: #d03050;
}

.progress-section {
  margin: 8px 0;
}

.progress-time {
  display: flex;
  justify-content: space-between;
  font-family: monospace;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.speed-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.speed-label {
  font-size: 12px;
  color: #999;
}

.final-result {
  padding: 8px 0;
}

.exam-lock {
  padding: 8px 0;
}
</style>
