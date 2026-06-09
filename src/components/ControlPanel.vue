<template>
  <div class="control-panel">
    <n-card title="控制面板" :bordered="false" size="small">
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
            <n-tag>日期</n-tag>
          </n-space>
          <n-date-picker
            v-model:value="dateValue"
            type="date"
            placeholder="选择日期"
            @update:value="onDateChange"
            style="width: 100%"
          />
        </div>

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag>时间</n-tag>
            <span style="font-family: monospace; font-size: 14px">
              {{ formatTime(timeValue) }}
            </span>
          </n-space>
          <n-time-picker
            v-model:value="timeValue"
            placeholder="选择时间"
            @update:value="onTimeChange"
            style="width: 100%"
            format="HH:mm"
          />
        </div>

        <n-divider />

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag>观测纬度</n-tag>
            <span style="font-family: monospace; font-size: 14px">
              {{ latitudeValue.toFixed(1) }}°
            </span>
          </n-space>
          <n-slider
            v-model:value="latitudeValue"
            :min="-90"
            :max="90"
            :step="0.5"
            @update:value="onLatitudeChange"
          />
          <n-space justify="space-between" style="margin-top: 4px">
            <span style="font-size: 12px; color: #999">-90°</span>
            <span style="font-size: 12px; color: #999">0°</span>
            <span style="font-size: 12px; color: #999">90°</span>
          </n-space>
        </div>

        <n-divider />

        <div>
          <n-tag style="margin-bottom: 8px">目标天体</n-tag>
          <n-select
            v-model:value="selectedBodyIdValue"
            :options="bodyOptions"
            @update:value="onBodySelect"
            style="width: 100%"
          />
          <n-alert
            v-if="!isBodyVisibleValue"
            type="warning"
            :show-icon="true"
            style="margin-top: 8px"
          >
            <template #header>
              该天体位于地平线以下
            </template>
            无法进行测量，请选择其他天体或调整时间/纬度
          </n-alert>
        </div>

        <n-divider />

        <div>
          <n-space justify="space-between" style="margin-bottom: 8px">
            <n-tag type="info">照准尺角度</n-tag>
            <span style="font-family: monospace; font-size: 14px">
              {{ alidadeAngleValue.toFixed(1) }}°
            </span>
          </n-space>
          <n-slider
            v-model:value="alidadeAngleValue"
            :min="0"
            :max="90"
            :step="0.1"
            :disabled="!isBodyVisibleValue"
            @update:value="onAlidadeChange"
          />
        </div>

        <n-space style="margin-top: 16px">
          <n-button
            type="primary"
            :disabled="!isBodyVisibleValue"
            @click="onComplete"
            style="flex: 1"
          >
            完成测量
          </n-button>
          <n-button @click="onReset" style="flex: 1">
            重置
          </n-button>
        </n-space>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NSpace, NTag, NRadioGroup, NRadioButton, NDivider, NDatePicker, NTimePicker, NSlider, NSelect, NAlert, NButton } from 'naive-ui'
import { useAstrolabeStore, type AppMode } from '../stores/astrolabe'
import { storeToRefs } from 'pinia'
import { CELESTIAL_BODIES } from '../utils/astronomy'
import type { SelectOption } from 'naive-ui'

const store = useAstrolabeStore()
const {
  mode: modeRef,
  date: dateRef,
  latitude: latitudeRef,
  selectedBodyId: selectedBodyIdRef,
  alidadeAngle: alidadeAngleRef,
  isBodyVisible: isBodyVisibleRef,
} = storeToRefs(store)

const modeValue = ref(modeRef.value)
const dateValue = ref(dateRef.value.getTime())
const timeValue = ref(dateRef.value.getTime())
const latitudeValue = ref(latitudeRef.value)
const selectedBodyIdValue = ref(selectedBodyIdRef.value)
const alidadeAngleValue = ref(alidadeAngleRef.value)

const isBodyVisibleValue = computed(() => isBodyVisibleRef.value)

const bodyOptions = computed<SelectOption[]>(() => {
  return CELESTIAL_BODIES.map((body) => ({
    label: body.name,
    value: body.id,
  }))
})

function formatTime(timestamp: number | null): string {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function onModeChange(value: string) {
  store.setMode(value as AppMode)
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

function onLatitudeChange(value: number) {
  store.setLatitude(value)
}

function onBodySelect(value: string | number | null) {
  if (typeof value === 'string') {
    store.selectBody(value)
  }
}

function onAlidadeChange(value: number) {
  store.setAlidadeAngle(value)
}

function onComplete() {
  store.completeMeasurement()
}

function onReset() {
  store.resetAll()
  dateValue.value = dateRef.value.getTime()
  timeValue.value = dateRef.value.getTime()
  latitudeValue.value = latitudeRef.value
  selectedBodyIdValue.value = selectedBodyIdRef.value
  alidadeAngleValue.value = alidadeAngleRef.value
}
</script>

<style scoped>
.control-panel {
  width: 320px;
}
</style>
