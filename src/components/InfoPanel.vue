<template>
  <div class="info-panel">
    <n-card title="测量信息" :bordered="false" size="small">
      <n-space vertical size="medium">
        <div class="info-row">
          <span class="info-label">目标天体</span>
          <n-tag type="info" size="large">{{ selectedBody.name }}</n-tag>
        </div>

        <n-divider />

        <div class="info-row">
          <span class="info-label">模拟高度</span>
          <span class="info-value">
            <template v-if="displayAltitude !== null">
              {{ displayAltitude.toFixed(2) }}°
            </template>
            <template v-else>
              <n-tag size="small" type="warning">考核模式</n-tag>
            </template>
          </span>
        </div>

        <div class="info-row">
          <span class="info-label">测量高度</span>
          <span class="info-value measured">{{ measuredAltitude.toFixed(2) }}°</span>
        </div>

        <div class="info-row">
          <span class="info-label">测量误差</span>
          <span :class="['info-value', errorClass]">
            <template v-if="displayError !== null">
              {{ displayError >= 0 ? '+' : '' }}{{ displayError.toFixed(2) }}°
            </template>
            <template v-else>
              <n-tag size="small" type="warning">考核模式</n-tag>
            </template>
          </span>
        </div>

        <div class="info-row">
          <span class="info-label">方位角</span>
          <span class="info-value">
            <template v-if="displayAzimuth !== null">
              {{ displayAzimuth.toFixed(1) }}°
            </template>
            <template v-else>
              <n-tag size="small" type="warning">考核模式</n-tag>
            </template>
          </span>
        </div>

        <n-divider />

        <div class="info-row">
          <span class="info-label">当前纬度</span>
          <span class="info-value">{{ latitude.toFixed(1) }}°</span>
        </div>

        <div class="info-row">
          <span class="info-label">可见状态</span>
          <n-tag :type="isBodyVisible ? 'success' : 'error'" size="large">
            {{ isBodyVisible ? '地平线以上' : '地平线以下' }}
          </n-tag>
        </div>
      </n-space>
    </n-card>

    <n-card title="操作步骤" :bordered="false" size="small" style="margin-top: 16px">
      <n-steps :current="currentStepIndex" vertical>
        <n-step
          v-for="step in steps"
          :key="step.id"
          :title="step.title"
          :description="step.description"
          :status="getStepStatus(step.status)"
        />
      </n-steps>
    </n-card>

    <n-card
      v-if="isMeasurementComplete"
      title="评分结果"
      :bordered="false"
      size="small"
      style="margin-top: 16px"
    >
      <n-space vertical align="center" style="width: 100%">
        <n-statistic :value="score" label="得分" :value-style="{ fontSize: '32px' }" />
        <n-tag :type="scoreTagType" size="large" style="font-size: 16px; padding: 8px 16px">
          {{ scoreGrade }}
        </n-tag>
        <n-progress
          type="line"
          :percentage="score"
          :color="scoreColor"
          style="width: 100%; margin-top: 8px"
        />
        <n-text depth="3" style="margin-top: 8px; text-align: center">
          误差: {{ measurementError >= 0 ? '+' : '' }}{{ measurementError.toFixed(2) }}°
        </n-text>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NDivider,
  NSteps,
  NStep,
  NStatistic,
  NProgress,
  NText,
} from 'naive-ui'
import { useAstrolabeStore } from '../stores/astrolabe'
import { storeToRefs } from 'pinia'
import type { StepStatus } from '../stores/astrolabe'

const store = useAstrolabeStore()
const {
  selectedBody,
  isBodyVisible,
  measuredAltitude,
  displayError,
  displayAltitude,
  displayAzimuth,
  latitude,
  steps,
  isMeasurementComplete,
  score,
  scoreGrade,
  measurementError,
} = storeToRefs(store)

const currentStepIndex = computed(() => {
  const index = steps.value.findIndex((s) => s.status === 'current')
  return index >= 0 ? index : 0
})

const errorClass = computed(() => {
  if (displayError.value === null) return ''
  const abs = Math.abs(displayError.value)
  if (abs <= 1) return 'excellent'
  if (abs <= 3) return 'good'
  if (abs <= 5) return 'warning'
  return 'error'
})

const scoreTagType = computed(() => {
  if (score.value >= 90) return 'success'
  if (score.value >= 70) return 'info'
  if (score.value >= 60) return 'warning'
  return 'error'
})

const scoreColor = computed(() => {
  if (score.value >= 90) return '#18a058'
  if (score.value >= 70) return '#2080f0'
  if (score.value >= 60) return '#f0a020'
  return '#d03050'
})

function getStepStatus(status: StepStatus): 'wait' | 'process' | 'finish' | 'error' {
  switch (status) {
    case 'pending':
      return 'wait'
    case 'current':
      return 'process'
    case 'completed':
      return 'finish'
    default:
      return 'wait'
  }
}
</script>

<style scoped>
.info-panel {
  width: 320px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  color: #999;
  font-size: 14px;
}

.info-value {
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.info-value.measured {
  color: #2080f0;
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
</style>
