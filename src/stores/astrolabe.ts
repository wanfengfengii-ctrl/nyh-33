import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  CELESTIAL_BODIES,
  type CelestialBody,
  getCelestialBodyPosition,
  calculateScore,
  getScoreGrade,
} from '../utils/astronomy'

export type AppMode = 'practice' | 'exam'

export type StepStatus = 'pending' | 'current' | 'completed'

export interface OperationStep {
  id: number
  title: string
  description: string
  status: StepStatus
}

export const useAstrolabeStore = defineStore('astrolabe', () => {
  const date = ref(new Date())
  const latitude = ref(30)
  const longitude = ref(120)
  const selectedBodyId = ref('sun')
  const mode = ref<AppMode>('practice')
  const alidadeAngle = ref(45)
  const isMeasurementComplete = ref(false)
  const score = ref(0)
  const scoreGrade = ref('')
  const measurementError = ref(0)

  const steps = ref<OperationStep[]>([
    { id: 1, title: '设置日期与时间', description: '调整观测的日期和时间', status: 'current' },
    { id: 2, title: '设置观测纬度', description: '输入观测地点的纬度', status: 'pending' },
    { id: 3, title: '选择目标天体', description: '选择要测量的天体', status: 'pending' },
    { id: 4, title: '旋转照准尺', description: '拖动照准尺对准天体', status: 'pending' },
    { id: 5, title: '完成测量', description: '查看测量结果和误差', status: 'pending' },
  ])

  const currentStep = computed(() => {
    return steps.value.find((s) => s.status === 'current') || steps.value[0]
  })

  const selectedBody = computed<CelestialBody>(() => {
    return CELESTIAL_BODIES.find((b) => b.id === selectedBodyId.value) || CELESTIAL_BODIES[0]
  })

  const bodyPosition = computed(() => {
    return getCelestialBodyPosition(selectedBody.value, date.value, latitude.value, longitude.value)
  })

  const isBodyVisible = computed(() => {
    return bodyPosition.value.altitude > 0
  })

  const measuredAltitude = computed(() => {
    return alidadeAngle.value
  })

  const error = computed(() => {
    return measuredAltitude.value - bodyPosition.value.altitude
  })

  const displayError = computed(() => {
    if (mode.value === 'exam' && !isMeasurementComplete.value) return null
    return error.value
  })

  const displayAltitude = computed(() => {
    if (mode.value === 'exam' && !isMeasurementComplete.value) return null
    return bodyPosition.value.altitude
  })

  function setDate(newDate: Date) {
    date.value = newDate
    updateStepStatus(1, 'completed')
    updateStepStatus(2, 'current')
  }

  function setLatitude(lat: number) {
    latitude.value = Math.max(-90, Math.min(90, lat))
    updateStepStatus(2, 'completed')
    updateStepStatus(3, 'current')
  }

  function setLongitude(lng: number) {
    longitude.value = lng
  }

  function selectBody(bodyId: string) {
    selectedBodyId.value = bodyId
    isMeasurementComplete.value = false
    updateStepStatus(3, 'completed')
    updateStepStatus(4, 'current')
  }

  function setAlidadeAngle(angle: number) {
    alidadeAngle.value = Math.max(0, Math.min(90, angle))
    if (steps.value[3].status !== 'completed') {
      updateStepStatus(4, 'current')
    }
  }

  function completeMeasurement() {
    if (!isBodyVisible.value) return

    isMeasurementComplete.value = true
    measurementError.value = error.value
    score.value = calculateScore(error.value)
    scoreGrade.value = getScoreGrade(score.value)
    updateStepStatus(4, 'completed')
    updateStepStatus(5, 'completed')
  }

  function resetMeasurement() {
    isMeasurementComplete.value = false
    score.value = 0
    scoreGrade.value = ''
    measurementError.value = 0
    alidadeAngle.value = 0
    updateStepStatus(4, 'current')
    updateStepStatus(5, 'pending')
  }

  function setMode(newMode: AppMode) {
    mode.value = newMode
    resetMeasurement()
    resetSteps()
  }

  function updateStepStatus(stepId: number, status: StepStatus) {
    const step = steps.value.find((s) => s.id === stepId)
    if (step) {
      step.status = status
    }
  }

  function resetSteps() {
    steps.value.forEach((step, index) => {
      if (index === 0) {
        step.status = 'current'
      } else {
        step.status = 'pending'
      }
    })
  }

  function setTime(hours: number, minutes: number) {
    const newDate = new Date(date.value)
    newDate.setHours(hours, minutes, 0, 0)
    date.value = newDate
    updateStepStatus(1, 'completed')
    updateStepStatus(2, 'current')
  }

  return {
    date,
    latitude,
    longitude,
    selectedBodyId,
    selectedBody,
    mode,
    alidadeAngle,
    isMeasurementComplete,
    score,
    scoreGrade,
    measurementError,
    steps,
    currentStep,
    bodyPosition,
    isBodyVisible,
    measuredAltitude,
    error,
    displayError,
    displayAltitude,
    setDate,
    setLatitude,
    setLongitude,
    selectBody,
    setAlidadeAngle,
    completeMeasurement,
    resetMeasurement,
    setMode,
    setTime,
  }
})
