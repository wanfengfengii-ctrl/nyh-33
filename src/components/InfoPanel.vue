<template>
  <div class="info-panel">
    <template v-if="mode !== 'navigation'">
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
    </template>

    <template v-else>
      <n-card title="航行信息" :bordered="false" size="small">
        <n-space vertical size="medium">
          <div class="info-row">
            <span class="info-label">起始位置</span>
            <span class="info-value small">
              {{ formatLatitude(navStartPosition.latitude) }}
              <br />
              {{ formatLongitude(navStartPosition.longitude) }}
            </span>
          </div>

          <div class="info-row">
            <span class="info-label">推算船位 (DR)</span>
            <span class="info-value small highlight">
              {{ formatLatitude(drPosition.latitude) }}
              <br />
              {{ formatLongitude(drPosition.longitude) }}
            </span>
          </div>

          <n-divider />

          <div class="info-row">
            <span class="info-label">船速</span>
            <span class="info-value">{{ navShipSpeed.toFixed(1) }} 节</span>
          </div>

          <div class="info-row">
            <span class="info-label">航向</span>
            <span class="info-value">{{ navShipHeading.toFixed(0) }}°</span>
          </div>

          <div class="info-row">
            <span class="info-label">航行时间</span>
            <span class="info-value">{{ navElapsedHours.toFixed(1) }} 小时</span>
          </div>

          <n-divider />

          <div class="info-row">
            <span class="info-label">海流速度</span>
            <span class="info-value">{{ navCurrentSpeed.toFixed(1) }} 节</span>
          </div>

          <div class="info-row">
            <span class="info-label">海流方向</span>
            <span class="info-value">{{ navCurrentDirection.toFixed(0) }}°</span>
          </div>
        </n-space>
      </n-card>

      <n-card title="天气海况" :bordered="false" size="small" style="margin-top: 16px">
        <n-space vertical size="small">
          <div class="info-row">
            <span class="info-label">云量</span>
            <n-tag :type="getCloudTagType(weather.cloudCover)" size="small">
              {{ weather.cloudCover.toFixed(0) }}%
            </n-tag>
          </div>
          <div class="info-row">
            <span class="info-label">风速</span>
            <n-tag :type="getWindTagType(weather.windSpeed)" size="small">
              {{ weather.windSpeed.toFixed(0) }} km/h
            </n-tag>
          </div>
          <div class="info-row">
            <span class="info-label">海况</span>
            <n-tag :type="getSeaTagType(weather.seaState)" size="small">
              {{ weather.seaState }} 级
            </n-tag>
          </div>
          <div class="info-row">
            <span class="info-label">昼夜</span>
            <n-tag :type="isNight ? 'info' : 'warning'" size="small">
              {{ isNight ? '夜间' : '白天' }}
            </n-tag>
          </div>
        </n-space>
      </n-card>

      <n-card title="导航步骤" :bordered="false" size="small" style="margin-top: 16px">
        <n-steps :current="navStepIndex" vertical>
          <n-step
            v-for="step in currentSteps"
            :key="step.id"
            :title="step.title"
            :description="step.description"
            :status="getStepStatus(step.status)"
          />
        </n-steps>
      </n-card>

      <n-card
        v-if="navIsComplete && navFixResult"
        title="定位评分"
        :bordered="false"
        size="small"
        style="margin-top: 16px"
      >
        <n-space vertical align="center" style="width: 100%">
          <n-statistic
            :value="navScore"
            label="综合得分"
            :value-style="{ fontSize: '32px', color: navScoreColor }"
          />
          <n-tag :type="navScoreTagType" size="large" style="font-size: 16px; padding: 8px 16px">
            {{ navScoreGrade }}
          </n-tag>
          <n-progress
            type="line"
            :percentage="navScore"
            :color="navScoreColor"
            style="width: 100%; margin-top: 8px"
          />
          <n-space vertical size="small" style="width: 100%; margin-top: 8px">
            <div class="info-row">
              <span class="info-label">定位误差</span>
              <span class="info-value">{{ navDistanceError.toFixed(2) }} km</span>
            </div>
            <div class="info-row">
              <span class="info-label">误差半径</span>
              <span class="info-value">{{ navFixResult.errorRadius.toFixed(2) }} km</span>
            </div>
            <div class="info-row">
              <span class="info-label">置信度</span>
              <span class="info-value">{{ navFixResult.confidence.toFixed(1) }}%</span>
            </div>
          </n-space>
        </n-space>
      </n-card>
    </template>
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
import { formatLatitude, formatLongitude } from '../utils/astronomy'

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
  mode,
  navStartPosition,
  drPosition,
  navShipSpeed,
  navShipHeading,
  navElapsedHours,
  navCurrentSpeed,
  navCurrentDirection,
  weather,
  isNight,
  currentSteps,
  navIsComplete,
  navFixResult,
  navScore,
  navScoreGrade,
  navDistanceError,
} = storeToRefs(store)

const currentStepIndex = computed(() => {
  const index = steps.value.findIndex((s) => s.status === 'current')
  return index >= 0 ? index : 0
})

const navStepIndex = computed(() => {
  const index = currentSteps.value.findIndex((s) => s.status === 'current')
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

const navScoreTagType = computed(() => {
  if (navScore.value >= 90) return 'success'
  if (navScore.value >= 70) return 'info'
  if (navScore.value >= 60) return 'warning'
  return 'error'
})

const navScoreColor = computed(() => {
  if (navScore.value >= 90) return '#18a058'
  if (navScore.value >= 70) return '#2080f0'
  if (navScore.value >= 60) return '#f0a020'
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

function getCloudTagType(cloudCover: number): 'success' | 'info' | 'warning' | 'error' {
  if (cloudCover <= 20) return 'success'
  if (cloudCover <= 50) return 'info'
  if (cloudCover <= 80) return 'warning'
  return 'error'
}

function getWindTagType(windSpeed: number): 'success' | 'info' | 'warning' | 'error' {
  if (windSpeed <= 20) return 'success'
  if (windSpeed <= 40) return 'info'
  if (windSpeed <= 70) return 'warning'
  return 'error'
}

function getSeaTagType(seaState: number): 'success' | 'info' | 'warning' | 'error' {
  if (seaState <= 2) return 'success'
  if (seaState <= 4) return 'info'
  if (seaState <= 6) return 'warning'
  return 'error'
}
</script>

<style scoped>
.info-panel {
  width: 320px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  text-align: right;
}

.info-value.small {
  font-size: 14px;
}

.info-value.measured {
  color: #2080f0;
}

.info-value.highlight {
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
