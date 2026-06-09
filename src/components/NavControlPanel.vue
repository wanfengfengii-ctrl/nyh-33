<template>
  <div class="nav-control-panel">
    <n-card title="恒星导航定位" :bordered="false" size="small">
      <n-space vertical size="medium">
        <n-space size="small" style="margin-bottom: 8px">
          <n-tag type="success" size="large">模式</n-tag>
          <n-radio-group v-model:value="modeValue" @update:value="onModeChange">
            <n-radio-button value="practice">练习</n-radio-button>
            <n-radio-button value="exam">考核</n-radio-button>
            <n-radio-button value="navigation">导航</n-radio-button>
          </n-radio-group>
        </n-space>

        <n-divider />

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="info">起始位置</n-tag>
          </n-space>
          <n-space>
            <div style="flex: 1">
              <n-input-number
                v-model:value="startLatValue"
                :min="-90"
                :max="90"
                :step="0.1"
                @update:value="onStartLatChange"
                style="width: 100%"
              />
              <span style="font-size: 11px; color: #999">纬度 (°N)</span>
            </div>
            <div style="flex: 1">
              <n-input-number
                v-model:value="startLonValue"
                :min="-180"
                :max="180"
                :step="0.1"
                @update:value="onStartLonChange"
                style="width: 100%"
              />
              <span style="font-size: 11px; color: #999">经度 (°E)</span>
            </div>
          </n-space>
        </div>

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="info">航行参数</n-tag>
          </n-space>
          <n-space vertical size="small">
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">船速</span>
                <span style="font-family: monospace; font-size: 12px">{{ shipSpeedValue.toFixed(1) }} 节</span>
              </n-space>
              <n-slider
                v-model:value="shipSpeedValue"
                :min="0"
                :max="30"
                :step="0.5"
                @update:value="onShipSpeedChange"
              />
            </div>
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">航向</span>
                <span style="font-family: monospace; font-size: 12px">{{ shipHeadingValue.toFixed(0) }}°</span>
              </n-space>
              <n-slider
                v-model:value="shipHeadingValue"
                :min="0"
                :max="360"
                :step="1"
                @update:value="onShipHeadingChange"
              />
            </div>
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">航行时间</span>
                <span style="font-family: monospace; font-size: 12px">{{ elapsedHoursValue.toFixed(1) }} 小时</span>
              </n-space>
              <n-slider
                v-model:value="elapsedHoursValue"
                :min="0"
                :max="24"
                :step="0.5"
                @update:value="onElapsedHoursChange"
              />
            </div>
          </n-space>
        </div>

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="info">海流参数</n-tag>
          </n-space>
          <n-space vertical size="small">
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">流速</span>
                <span style="font-family: monospace; font-size: 12px">{{ currentSpeedValue.toFixed(1) }} 节</span>
              </n-space>
              <n-slider
                v-model:value="currentSpeedValue"
                :min="0"
                :max="10"
                :step="0.2"
                @update:value="onCurrentSpeedChange"
              />
            </div>
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">流向</span>
                <span style="font-family: monospace; font-size: 12px">{{ currentDirectionValue.toFixed(0) }}°</span>
              </n-space>
              <n-slider
                v-model:value="currentDirectionValue"
                :min="0"
                :max="360"
                :step="1"
                @update:value="onCurrentDirectionChange"
              />
            </div>
          </n-space>
        </div>

        <n-divider />

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="warning">天气海况</n-tag>
          </n-space>
          <n-space vertical size="small">
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">云量</span>
                <span style="font-family: monospace; font-size: 12px">{{ cloudCoverValue.toFixed(0) }}%</span>
              </n-space>
              <n-slider
                v-model:value="cloudCoverValue"
                :min="0"
                :max="100"
                :step="5"
                @update:value="onWeatherChange"
              />
            </div>
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">风速</span>
                <span style="font-family: monospace; font-size: 12px">{{ windSpeedValue.toFixed(0) }} km/h</span>
              </n-space>
              <n-slider
                v-model:value="windSpeedValue"
                :min="0"
                :max="100"
                :step="5"
                @update:value="onWeatherChange"
              />
            </div>
            <div>
              <n-space justify="space-between">
                <span style="font-size: 12px; color: #666">海况等级</span>
                <span style="font-family: monospace; font-size: 12px">{{ seaStateValue }} 级</span>
              </n-space>
              <n-slider
                v-model:value="seaStateValue"
                :min="0"
                :max="9"
                :step="1"
                @update:value="onWeatherChange"
              />
            </div>
          </n-space>
        </div>

        <n-divider />

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="info">观测时间</n-tag>
          </n-space>
          <n-date-picker
            v-model:value="dateValue"
            type="date"
            placeholder="选择日期"
            @update:value="onDateChange"
            style="width: 100%; margin-bottom: 8px"
          />
          <n-time-picker
            v-model:value="timeValue"
            placeholder="选择时间"
            @update:value="onTimeChange"
            style="width: 100%"
            format="HH:mm"
          />
          <n-alert
            v-if="isNightValue"
            type="info"
            :show-icon="true"
            style="margin-top: 8px"
          >
            <template #header>夜间观测</template>
            当前为夜间，可观测恒星
          </n-alert>
          <n-alert
            v-else
            type="warning"
            :show-icon="true"
            style="margin-top: 8px"
          >
            <template #header>白天观测</template>
            白天仅可观测太阳
          </n-alert>
        </div>

        <n-divider />

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="primary">选择天体</n-tag>
            <n-tag size="small" type="info">已选 {{ navObservations.length }}/3</n-tag>
          </n-space>
          <n-select
            v-model:value="selectedBodyIdValue"
            :options="bodyOptions"
            @update:value="onBodySelect"
            style="width: 100%; margin-bottom: 8px"
          />
          <n-alert
            v-if="!canObserveBodyValue"
            type="error"
            :show-icon="true"
            style="margin-bottom: 8px"
          >
            <template #header>无法观测</template>
            {{ isNightValue ? '该恒星不在地平线以上' : '白天只能观测太阳' }}
          </n-alert>
          <n-space style="margin-top: 8px">
            <n-button
              type="primary"
              :disabled="!canObserveBodyValue || navObservations.length >= 3"
              @click="onAddObservation"
              style="flex: 1"
            >
              添加观测
            </n-button>
          </n-space>
        </div>

        <n-divider v-if="navObservations.length > 0" />

        <div v-if="navObservations.length > 0">
          <n-tag type="success" style="margin-bottom: 8px">观测记录</n-tag>
          <n-space vertical size="small">
            <div
              v-for="obs in navObservations"
              :key="obs.id"
              class="observation-item"
            >
              <n-space justify="space-between" align="center">
                <div>
                  <n-tag size="small" type="info">{{ obs.bodyName }}</n-tag>
                  <div style="font-size: 12px; color: #666; margin-top: 4px">
                    高度: <span style="font-family: monospace">{{ obs.measuredAltitude.toFixed(2) }}°</span>
                  </div>
                  <div style="font-size: 11px; color: #999">
                    方位: {{ obs.azimuth.toFixed(1) }}°
                  </div>
                </div>
                <n-button
                  size="small"
                  quaternary
                  @click="onRemoveObservation(obs.id)"
                >
                  删除
                </n-button>
              </n-space>
            </div>
          </n-space>
        </div>

        <n-divider v-if="navObservations.length >= 2" />

        <div v-if="navObservations.length >= 2">
          <n-button
            type="primary"
            size="large"
            block
            @click="onCalculateFix"
            :loading="calculating"
          >
            计算船位
          </n-button>
        </div>

        <n-space v-if="navIsComplete" style="margin-top: 8px">
          <n-button @click="onReset" style="flex: 1">重置</n-button>
          <n-button type="success" @click="onRandomScenario" style="flex: 1">
            随机场景
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <n-card
      v-if="navIsComplete && navFixResult"
      title="定位结果"
      :bordered="false"
      size="small"
      style="margin-top: 16px"
    >
      <n-space vertical size="medium" style="width: 100%">
        <div class="result-row">
          <span class="result-label">推算船位</span>
          <span class="result-value">
            {{ formatLatitude(drPosition.latitude) }}
            <br />
            {{ formatLongitude(drPosition.longitude) }}
          </span>
        </div>
        <div class="result-row">
          <span class="result-label">观测定位</span>
          <span class="result-value highlight">
            {{ formatLatitude(navFixResult.position.latitude) }}
            <br />
            {{ formatLongitude(navFixResult.position.longitude) }}
          </span>
        </div>
        <div class="result-row">
          <span class="result-label">误差半径</span>
          <span class="result-value">
            {{ navFixResult.errorRadius.toFixed(2) }} km
          </span>
        </div>
        <div class="result-row">
          <span class="result-label">置信度</span>
          <span class="result-value">
            {{ navFixResult.confidence.toFixed(1) }}%
          </span>
        </div>
        <div v-if="navFixResult.errorTriangle" class="result-row">
          <span class="result-label">误差三角面积</span>
          <span class="result-value">
            {{ navFixResult.errorTriangle.area.toFixed(2) }} km²
          </span>
        </div>

        <n-divider />

        <div class="score-section">
          <n-statistic
            :value="navScore"
            label="定位得分"
            :value-style="{ fontSize: '32px', color: scoreColor }"
          />
          <n-tag :type="scoreTagType" size="large" style="margin-top: 8px; font-size: 16px; padding: 8px 16px">
            {{ navScoreGrade }}
          </n-tag>
          <n-progress
            type="line"
            :percentage="navScore"
            :color="scoreColor"
            style="width: 100%; margin-top: 8px"
          />
          <n-text depth="3" style="margin-top: 8px; text-align: center; display: block">
            与真实位置偏差: {{ navDistanceError.toFixed(2) }} km
          </n-text>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NRadioGroup,
  NRadioButton,
  NDivider,
  NSlider,
  NSelect,
  NAlert,
  NButton,
  NInputNumber,
  NDatePicker,
  NTimePicker,
  NStatistic,
  NProgress,
  NText,
} from 'naive-ui'
import { useAstrolabeStore } from '../stores/astrolabe'
import { storeToRefs } from 'pinia'
import { CELESTIAL_BODIES, formatLatitude, formatLongitude } from '../utils/astronomy'
import type { SelectOption } from 'naive-ui'

const store = useAstrolabeStore()
const {
  mode: modeRef,
  date: dateRef,
  selectedBodyId: selectedBodyIdRef,
  navObservations,
  navIsComplete,
  navFixResult,
  navScore,
  navScoreGrade,
  navDistanceError,
  navStartPosition,
  navShipSpeed,
  navShipHeading,
  navElapsedHours,
  navCurrentSpeed,
  navCurrentDirection,
  weather,
  drPosition,
  isNight: isNightValue,
  canObserveBody: canObserveBodyValue,
} = storeToRefs(store)

const calculating = ref(false)

const modeValue = ref(modeRef.value)
const dateValue = ref(dateRef.value.getTime())
const timeValue = ref(dateRef.value.getTime())
const selectedBodyIdValue = ref(selectedBodyIdRef.value)

const startLatValue = ref(navStartPosition.value.latitude)
const startLonValue = ref(navStartPosition.value.longitude)
const shipSpeedValue = ref(navShipSpeed.value)
const shipHeadingValue = ref(navShipHeading.value)
const elapsedHoursValue = ref(navElapsedHours.value)
const currentSpeedValue = ref(navCurrentSpeed.value)
const currentDirectionValue = ref(navCurrentDirection.value)

const cloudCoverValue = ref(weather.value.cloudCover)
const windSpeedValue = ref(weather.value.windSpeed)
const seaStateValue = ref(weather.value.seaState)

const bodyOptions = computed<SelectOption[]>(() => {
  return CELESTIAL_BODIES.map((body) => ({
    label: body.name,
    value: body.id,
  }))
})

const scoreTagType = computed(() => {
  if (navScore.value >= 90) return 'success'
  if (navScore.value >= 70) return 'info'
  if (navScore.value >= 60) return 'warning'
  return 'error'
})

const scoreColor = computed(() => {
  if (navScore.value >= 90) return '#18a058'
  if (navScore.value >= 70) return '#2080f0'
  if (navScore.value >= 60) return '#f0a020'
  return '#d03050'
})

function onModeChange(value: string) {
  store.setMode(value as 'practice' | 'exam' | 'navigation')
}

function onDateChange(value: number | null) {
  if (value) {
    const newDate = new Date(value)
    const currentDate = new Date(dateRef.value)
    newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0)
    store.setDate(newDate)
  }
}

function onTimeChange(value: number | null) {
  if (value) {
    const timeDate = new Date(value)
    store.setTime(timeDate.getHours(), timeDate.getMinutes())
    timeValue.value = value
  }
}

function onBodySelect(value: string | number | null) {
  if (typeof value === 'string') {
    store.selectBody(value)
  }
}

function onStartLatChange(value: number | null) {
  if (value === null) return
  store.setNavStartPosition({
    latitude: value,
    longitude: startLonValue.value,
  })
}

function onStartLonChange(value: number | null) {
  if (value === null) return
  store.setNavStartPosition({
    latitude: startLatValue.value,
    longitude: value,
  })
}

function onShipSpeedChange(value: number) {
  store.setNavShipSpeed(value)
}

function onShipHeadingChange(value: number) {
  store.setNavShipHeading(value)
}

function onElapsedHoursChange(value: number) {
  store.setNavElapsedHours(value)
}

function onCurrentSpeedChange(value: number) {
  store.setNavCurrentSpeed(value)
}

function onCurrentDirectionChange(value: number) {
  store.setNavCurrentDirection(value)
}

function onWeatherChange() {
  store.setWeather({
    cloudCover: cloudCoverValue.value,
    windSpeed: windSpeedValue.value,
    seaState: seaStateValue.value,
    visibility: 10 - seaStateValue.value,
  })
}

function onAddObservation() {
  store.addNavObservation()
}

function onRemoveObservation(id: number) {
  store.removeNavObservation(id)
}

function onCalculateFix() {
  calculating.value = true
  setTimeout(() => {
    store.calculateNavFix()
    calculating.value = false
  }, 500)
}

function onReset() {
  store.resetNavigation()
}

function onRandomScenario() {
  store.generateRandomScenario()
  startLatValue.value = navStartPosition.value.latitude
  startLonValue.value = navStartPosition.value.longitude
  shipSpeedValue.value = navShipSpeed.value
  shipHeadingValue.value = navShipHeading.value
  elapsedHoursValue.value = navElapsedHours.value
  currentSpeedValue.value = navCurrentSpeed.value
  currentDirectionValue.value = navCurrentDirection.value
  cloudCoverValue.value = weather.value.cloudCover
  windSpeedValue.value = weather.value.windSpeed
  seaStateValue.value = weather.value.seaState
}

watch(modeRef, (newMode) => {
  modeValue.value = newMode
})

watch(dateRef, (newDate) => {
  dateValue.value = newDate.getTime()
  timeValue.value = newDate.getTime()
})

watch(selectedBodyIdRef, (newId) => {
  selectedBodyIdValue.value = newId
})
</script>

<style scoped>
.nav-control-panel {
  width: 320px;
}

.observation-item {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.result-label {
  color: #666;
  font-size: 13px;
}

.result-value {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-align: right;
}

.result-value.highlight {
  color: #2080f0;
  font-size: 15px;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 16px 0;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
}
</style>
