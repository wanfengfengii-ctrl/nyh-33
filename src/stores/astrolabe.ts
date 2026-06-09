import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  CELESTIAL_BODIES,
  type CelestialBody,
  getCelestialBodyPosition,
  calculateScore,
  getScoreGrade,
  type Observation,
  type Position,
  type FixResult,
  type WeatherConditions,
  calculateFix,
  applyWeatherNoise,
  applyInstrumentNoise,
  isNightTime,
  calculateNavScore,
  calculateDeadReckoning,
  formatLatitude,
  formatLongitude,
} from '../utils/astronomy'

export type AppMode = 'practice' | 'exam' | 'navigation'

export type StepStatus = 'pending' | 'current' | 'completed'

export interface OperationStep {
  id: number
  title: string
  description: string
  status: StepStatus
}

export interface NavObservation extends Observation {
  id: number
  hasWeatherNoise: boolean
  hasInstrumentNoise: boolean
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

  const navObservations = ref<NavObservation[]>([])
  const navObservationIdCounter = ref(0)
  const navFixResult = ref<FixResult | null>(null)
  const navIsComplete = ref(false)
  const navScore = ref(0)
  const navScoreGrade = ref('')
  const navDistanceError = ref(0)
  const navTruePosition = ref<Position>({ latitude: 35, longitude: 125 })
  const navStartPosition = ref<Position>({ latitude: 30, longitude: 120 })
  const navShipSpeed = ref(10)
  const navShipHeading = ref(45)
  const navElapsedHours = ref(4)
  const navCurrentSpeed = ref(2)
  const navCurrentDirection = ref(90)

  const weather = ref<WeatherConditions>({
    cloudCover: 20,
    windSpeed: 15,
    seaState: 3,
    visibility: 10,
  })

  const navSteps = ref<OperationStep[]>([
    { id: 1, title: '设置航行参数', description: '设置船速、航向和时间', status: 'current' },
    { id: 2, title: '设置天气条件', description: '设置天气和海况', status: 'pending' },
    { id: 3, title: '选择天体测量', description: '测量2-3个天体的高度', status: 'pending' },
    { id: 4, title: '计算船位', description: '根据观测计算推算船位', status: 'pending' },
    { id: 5, title: '查看结果', description: '查看定位结果和评分', status: 'pending' },
  ])

  const currentStep = computed(() => {
    if (mode.value === 'navigation') {
      return navSteps.value.find((s) => s.status === 'current') || navSteps.value[0]
    }
    return steps.value.find((s) => s.status === 'current') || steps.value[0]
  })

  const currentSteps = computed(() => {
    if (mode.value === 'navigation') {
      return navSteps.value
    }
    return steps.value
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

  const isNight = computed(() => {
    return isNightTime(date.value, latitude.value, longitude.value)
  })

  const canObserveBody = computed(() => {
    if (!isBodyVisible.value) return false
    if (isNight.value && selectedBody.value.id === 'sun') return false
    if (!isNight.value && selectedBody.value.id !== 'sun') return false
    return true
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

  const displayAzimuth = computed(() => {
    if (mode.value === 'exam' && !isMeasurementComplete.value) return null
    return bodyPosition.value.azimuth
  })

  const drPosition = computed(() => {
    return calculateDeadReckoning({
      startPosition: navStartPosition.value,
      speed: navShipSpeed.value,
      heading: navShipHeading.value,
      timeHours: navElapsedHours.value,
      currentSpeed: navCurrentSpeed.value,
      currentDirection: navCurrentDirection.value,
    })
  })

  const navCanCalculate = computed(() => {
    return navObservations.value.length >= 2
  })

  function setDate(newDate: Date) {
    date.value = newDate
    if (isMeasurementComplete.value) {
      resetMeasurement()
    }
    if (mode.value !== 'navigation') {
      setCurrentStep(2)
    }
  }

  function setLatitude(lat: number) {
    latitude.value = Math.max(-90, Math.min(90, lat))
    if (isMeasurementComplete.value) {
      resetMeasurement()
    }
    if (mode.value !== 'navigation') {
      setCurrentStep(3)
    }
  }

  function setLongitude(lng: number) {
    longitude.value = lng
  }

  function selectBody(bodyId: string) {
    selectedBodyId.value = bodyId
    if (isMeasurementComplete.value) {
      resetMeasurement()
    }
    if (mode.value !== 'navigation') {
      setCurrentStep(4)
    }
  }

  function setAlidadeAngle(angle: number) {
    alidadeAngle.value = Math.max(0, Math.min(90, angle))
    if (mode.value !== 'navigation' && steps.value[3].status !== 'completed') {
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
    if (mode.value !== 'navigation') {
      setCurrentStep(4)
    }
  }

  function resetAll() {
    date.value = new Date()
    latitude.value = 30
    longitude.value = 120
    selectedBodyId.value = 'sun'
    alidadeAngle.value = 45
    isMeasurementComplete.value = false
    score.value = 0
    scoreGrade.value = ''
    measurementError.value = 0
    resetSteps()
  }

  function setMode(newMode: AppMode) {
    mode.value = newMode
    resetMeasurement()
    resetSteps()
    if (newMode === 'navigation') {
      resetNavigation()
    }
  }

  function updateStepStatus(stepId: number, status: StepStatus) {
    const stepList = mode.value === 'navigation' ? navSteps.value : steps.value
    const step = stepList.find((s) => s.id === stepId)
    if (step) {
      step.status = status
    }

    if (status === 'current') {
      const stepIndex = stepList.findIndex((s) => s.id === stepId)
      for (let i = stepIndex + 1; i < stepList.length; i++) {
        stepList[i].status = 'pending'
      }
    }
  }

  function setCurrentStep(stepId: number) {
    const stepList = mode.value === 'navigation' ? navSteps.value : steps.value
    const stepIndex = stepList.findIndex((s) => s.id === stepId)
    if (stepIndex < 0) return

    for (let i = 0; i < stepList.length; i++) {
      if (i < stepIndex) {
        stepList[i].status = 'completed'
      } else if (i === stepIndex) {
        stepList[i].status = 'current'
      } else {
        stepList[i].status = 'pending'
      }
    }
  }

  function resetSteps() {
    const stepList = mode.value === 'navigation' ? navSteps.value : steps.value
    stepList.forEach((step, index) => {
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
    if (isMeasurementComplete.value) {
      resetMeasurement()
    }
    if (mode.value !== 'navigation') {
      setCurrentStep(2)
    }
  }

  function setWeather(newWeather: WeatherConditions) {
    weather.value = { ...newWeather }
  }

  function addNavObservation() {
    if (!canObserveBody.value) return null

    const trueAlt = bodyPosition.value.altitude
    let measuredAlt = trueAlt

    measuredAlt = applyWeatherNoise(measuredAlt, weather.value)
    measuredAlt = applyInstrumentNoise(measuredAlt)

    const obs: NavObservation = {
      id: navObservationIdCounter.value++,
      bodyId: selectedBody.value.id,
      bodyName: selectedBody.value.name,
      measuredAltitude: measuredAlt,
      trueAltitude: trueAlt,
      observationTime: new Date(date.value),
      azimuth: bodyPosition.value.azimuth,
      hasWeatherNoise: true,
      hasInstrumentNoise: true,
    }

    navObservations.value.push(obs)

    updateNavStepStatus()

    return obs
  }

  function removeNavObservation(id: number) {
    const index = navObservations.value.findIndex((o) => o.id === id)
    if (index >= 0) {
      navObservations.value.splice(index, 1)
    }
    navIsComplete.value = false
    navFixResult.value = null
    updateNavStepStatus()
  }

  function updateNavStepStatus() {
    const count = navObservations.value.length
    if (count >= 2) {
      updateNavStep(3, 'completed')
      updateNavStep(4, 'current')
    } else if (count > 0) {
      updateNavStep(2, 'completed')
      updateNavStep(3, 'current')
    }
  }

  function updateNavStep(stepId: number, status: StepStatus) {
    const step = navSteps.value.find((s) => s.id === stepId)
    if (step) {
      step.status = status
    }
  }

  function calculateNavFix() {
    if (navObservations.value.length < 2) return null

    const assumedPos = { ...drPosition.value }

    const result = calculateFix(navObservations.value, assumedPos)
    navFixResult.value = result

    if (result) {
      const navScoreResult = calculateNavScore(result, navTruePosition.value)
      navScore.value = navScoreResult.score
      navScoreGrade.value = navScoreResult.grade
      navDistanceError.value = navScoreResult.distanceError
      navIsComplete.value = true

      updateNavStep(4, 'completed')
      updateNavStep(5, 'completed')
    }

    return result
  }

  function resetNavigation() {
    navObservations.value = []
    navFixResult.value = null
    navIsComplete.value = false
    navScore.value = 0
    navScoreGrade.value = ''
    navDistanceError.value = 0
    navObservationIdCounter.value = 0

    navSteps.value.forEach((step, index) => {
      step.status = index === 0 ? 'current' : 'pending'
    })
  }

  function setNavStartPosition(pos: Position) {
    navStartPosition.value = { ...pos }
  }

  function setNavShipSpeed(speed: number) {
    navShipSpeed.value = Math.max(0, Math.min(30, speed))
  }

  function setNavShipHeading(heading: number) {
    navShipHeading.value = ((heading % 360) + 360) % 360
  }

  function setNavElapsedHours(hours: number) {
    navElapsedHours.value = Math.max(0, Math.min(24, hours))
  }

  function setNavCurrentSpeed(speed: number) {
    navCurrentSpeed.value = Math.max(0, Math.min(10, speed))
  }

  function setNavCurrentDirection(direction: number) {
    navCurrentDirection.value = ((direction % 360) + 360) % 360
  }

  function setNavTruePosition(pos: Position) {
    navTruePosition.value = { ...pos }
  }

  function generateRandomScenario() {
    const startLat = 20 + Math.random() * 40
    const startLon = 110 + Math.random() * 30
    navStartPosition.value = { latitude: startLat, longitude: startLon }

    navShipSpeed.value = 5 + Math.random() * 15
    navShipHeading.value = Math.random() * 360
    navElapsedHours.value = 2 + Math.random() * 6

    navCurrentSpeed.value = Math.random() * 3
    navCurrentDirection.value = Math.random() * 360

    const dr = calculateDeadReckoning({
      startPosition: navStartPosition.value,
      speed: navShipSpeed.value,
      heading: navShipHeading.value,
      timeHours: navElapsedHours.value,
      currentSpeed: navCurrentSpeed.value,
      currentDirection: navCurrentDirection.value,
    })

    const errorLat = (Math.random() - 0.5) * 2
    const errorLon = (Math.random() - 0.5) * 2
    navTruePosition.value = {
      latitude: dr.latitude + errorLat,
      longitude: dr.longitude + errorLon,
    }

    weather.value = {
      cloudCover: Math.random() * 60,
      windSpeed: Math.random() * 40,
      seaState: Math.floor(Math.random() * 6) + 1,
      visibility: 5 + Math.random() * 10,
    }

    resetNavigation()
  }

  function getCurrentFrameData() {
    return {
      date: new Date(date.value),
      latitude: latitude.value,
      longitude: longitude.value,
      selectedBodyId: selectedBodyId.value,
      alidadeAngle: alidadeAngle.value,
      bodyAltitude: bodyPosition.value.altitude,
      bodyAzimuth: bodyPosition.value.azimuth,
      currentStepId: currentStep.value.id,
      isMeasurementComplete: isMeasurementComplete.value,
      score: score.value,
      scoreGrade: scoreGrade.value,
      measurementError: measurementError.value,
    }
  }

  function getFinalResult() {
    return {
      bodyId: selectedBody.value.id,
      bodyName: selectedBody.value.name,
      measuredAltitude: measuredAltitude.value,
      trueAltitude: bodyPosition.value.altitude,
      measurementError: error.value,
      score: score.value,
      scoreGrade: scoreGrade.value,
      latitude: latitude.value,
      observationDate: new Date(date.value),
    }
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
    currentSteps,
    bodyPosition,
    isBodyVisible,
    measuredAltitude,
    error,
    displayError,
    displayAltitude,
    displayAzimuth,
    isNight,
    canObserveBody,
    navObservations,
    navFixResult,
    navIsComplete,
    navScore,
    navScoreGrade,
    navDistanceError,
    navTruePosition,
    navStartPosition,
    navShipSpeed,
    navShipHeading,
    navElapsedHours,
    navCurrentSpeed,
    navCurrentDirection,
    weather,
    drPosition,
    navCanCalculate,
    setDate,
    setLatitude,
    setLongitude,
    selectBody,
    setAlidadeAngle,
    completeMeasurement,
    resetMeasurement,
    resetAll,
    setMode,
    setTime,
    setWeather,
    addNavObservation,
    removeNavObservation,
    calculateNavFix,
    resetNavigation,
    setNavStartPosition,
    setNavShipSpeed,
    setNavShipHeading,
    setNavElapsedHours,
    setNavCurrentSpeed,
    setNavCurrentDirection,
    setNavTruePosition,
    generateRandomScenario,
    formatLatitude,
    formatLongitude,
    getCurrentFrameData,
    getFinalResult,
  }
})
