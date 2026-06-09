import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppMode, OperationStep } from './astrolabe'

export interface LogFrame {
  timestamp: number
  date: Date
  latitude: number
  longitude: number
  selectedBodyId: string
  alidadeAngle: number
  bodyAltitude: number
  bodyAzimuth: number
  currentStepId: number
  isMeasurementComplete: boolean
  score: number
  scoreGrade: string
  measurementError: number
}

export interface ObservationLog {
  id: string
  mode: AppMode
  title: string
  startTime: number
  endTime: number
  frames: LogFrame[]
  finalResult: {
    bodyId: string
    bodyName: string
    measuredAltitude: number
    trueAltitude: number
    measurementError: number
    score: number
    scoreGrade: string
    latitude: number
    observationDate: Date
  }
  steps: OperationStep[]
  duration: number
}

export type LogFilterMode = 'all' | AppMode
export type LogSortBy = 'date' | 'score' | 'duration'

const STORAGE_KEY = 'astrolabe_logs'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function loadLogsFromStorage(): ObservationLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((log: any) => ({
        ...log,
        startTime: new Date(log.startTime).getTime(),
        endTime: new Date(log.endTime).getTime(),
        finalResult: {
          ...log.finalResult,
          observationDate: new Date(log.finalResult.observationDate),
        },
        frames: log.frames.map((f: any) => ({
          ...f,
          date: new Date(f.date),
        })),
      }))
    }
  } catch (e) {
    console.error('Failed to load logs from storage:', e)
  }
  return []
}

function saveLogsToStorage(logs: ObservationLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch (e) {
    console.error('Failed to save logs to storage:', e)
  }
}

export const useLogStore = defineStore('log', () => {
  const logs = ref<ObservationLog[]>(loadLogsFromStorage())
  const isRecording = ref(false)
  const currentRecordingId = ref<string | null>(null)
  const currentFrames = ref<LogFrame[]>([])
  const recordingStartTime = ref<number>(0)

  const isReplayMode = ref(false)
  const currentReplayLog = ref<ObservationLog | null>(null)
  const currentReplayFrameIndex = ref(0)
  const isReplayPlaying = ref(false)
  const replaySpeed = ref(1)
  const replayInterval = ref<number | null>(null)

  const filterMode = ref<LogFilterMode>('all')
  const sortBy = ref<LogSortBy>('date')
  const dateRange = ref<[number, number] | null>(null)
  const searchQuery = ref('')

  const filteredLogs = computed(() => {
    let result = [...logs.value]

    if (filterMode.value !== 'all') {
      result = result.filter((log) => log.mode === filterMode.value)
    }

    if (dateRange.value) {
      const [start, end] = dateRange.value
      result = result.filter((log) => log.startTime >= start && log.endTime <= end)
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      result = result.filter(
        (log) =>
          log.title.toLowerCase().includes(query) ||
          log.finalResult.bodyName.toLowerCase().includes(query)
      )
    }

    switch (sortBy.value) {
      case 'date':
        result.sort((a, b) => b.startTime - a.startTime)
        break
      case 'score':
        result.sort((a, b) => b.finalResult.score - a.finalResult.score)
        break
      case 'duration':
        result.sort((a, b) => b.duration - a.duration)
        break
    }

    return result
  })

  const stats = computed(() => {
    const practiceLogs = logs.value.filter((l) => l.mode === 'practice')
    const examLogs = logs.value.filter((l) => l.mode === 'exam')

    const avgScore = (list: ObservationLog[]) => {
      if (list.length === 0) return 0
      const sum = list.reduce((acc, log) => acc + log.finalResult.score, 0)
      return Math.round((sum / list.length) * 10) / 10
    }

    const avgError = (list: ObservationLog[]) => {
      if (list.length === 0) return 0
      const sum = list.reduce((acc, log) => acc + Math.abs(log.finalResult.measurementError), 0)
      return Math.round((sum / list.length) * 100) / 100
    }

    return {
      totalCount: logs.value.length,
      practiceCount: practiceLogs.length,
      examCount: examLogs.length,
      avgPracticeScore: avgScore(practiceLogs),
      avgExamScore: avgScore(examLogs),
      avgPracticeError: avgError(practiceLogs),
      avgExamError: avgError(examLogs),
    }
  })

  const currentReplayFrame = computed(() => {
    if (!currentReplayLog.value) return null
    const frames = currentReplayLog.value.frames
    if (frames.length === 0) return null
    const index = Math.min(currentReplayFrameIndex.value, frames.length - 1)
    return frames[index]
  })

  const replayProgress = computed(() => {
    if (!currentReplayLog.value || currentReplayLog.value.frames.length === 0) return 0
    const total = currentReplayLog.value.frames.length - 1
    if (total <= 0) return 0
    return (currentReplayFrameIndex.value / total) * 100
  })

  const replayTime = computed(() => {
    if (!currentReplayLog.value || !currentReplayFrame.value) return 0
    return currentReplayFrame.value.timestamp - currentReplayLog.value.startTime
  })

  function startRecording() {
    if (isRecording.value) return

    isRecording.value = true
    currentRecordingId.value = generateId()
    currentFrames.value = []
    recordingStartTime.value = Date.now()
  }

  function recordFrame(frame: Omit<LogFrame, 'timestamp'>) {
    if (!isRecording.value) return

    currentFrames.value.push({
      ...frame,
      timestamp: Date.now(),
    })
  }

  function stopRecording(
    mode: AppMode,
    finalResult: ObservationLog['finalResult'],
    steps: OperationStep[]
  ): ObservationLog | null {
    if (!isRecording.value || currentFrames.value.length === 0) {
      isRecording.value = false
      currentRecordingId.value = null
      currentFrames.value = []
      return null
    }

    const endTime = Date.now()
    const duration = endTime - recordingStartTime.value

    const log: ObservationLog = {
      id: currentRecordingId.value || generateId(),
      mode,
      title: `${finalResult.bodyName}观测 - ${new Date(recordingStartTime.value).toLocaleString('zh-CN')}`,
      startTime: recordingStartTime.value,
      endTime,
      frames: currentFrames.value,
      finalResult,
      steps: JSON.parse(JSON.stringify(steps)),
      duration,
    }

    logs.value.unshift(log)
    saveLogsToStorage(logs.value)

    isRecording.value = false
    currentRecordingId.value = null
    currentFrames.value = []
    recordingStartTime.value = 0

    return log
  }

  function cancelRecording() {
    isRecording.value = false
    currentRecordingId.value = null
    currentFrames.value = []
    recordingStartTime.value = 0
  }

  function deleteLog(id: string) {
    const index = logs.value.findIndex((l) => l.id === id)
    if (index >= 0) {
      logs.value.splice(index, 1)
      saveLogsToStorage(logs.value)
    }
  }

  function clearAllLogs() {
    logs.value = []
    saveLogsToStorage(logs.value)
  }

  function startReplay(logId: string) {
    const log = logs.value.find((l) => l.id === logId)
    if (!log || log.frames.length === 0) return

    isReplayMode.value = true
    currentReplayLog.value = log
    currentReplayFrameIndex.value = 0
    isReplayPlaying.value = false
  }

  function stopReplay() {
    pauseReplay()
    isReplayMode.value = false
    currentReplayLog.value = null
    currentReplayFrameIndex.value = 0
  }

  function playReplay() {
    if (!currentReplayLog.value || isReplayPlaying.value) return
    if (currentReplayFrameIndex.value >= currentReplayLog.value.frames.length - 1) {
      currentReplayFrameIndex.value = 0
    }

    isReplayPlaying.value = true
    runReplayLoop()
  }

  function pauseReplay() {
    isReplayPlaying.value = false
    if (replayInterval.value) {
      clearInterval(replayInterval.value)
      replayInterval.value = null
    }
  }

  function toggleReplayPlay() {
    if (isReplayPlaying.value) {
      pauseReplay()
    } else {
      playReplay()
    }
  }

  function runReplayLoop() {
    if (replayInterval.value) {
      clearInterval(replayInterval.value)
    }

    const speed = replaySpeed.value
    const intervalMs = 100 / speed

    replayInterval.value = window.setInterval(() => {
      if (!currentReplayLog.value || !isReplayPlaying.value) return

      if (currentReplayFrameIndex.value < currentReplayLog.value.frames.length - 1) {
        currentReplayFrameIndex.value++
      } else {
        pauseReplay()
      }
    }, intervalMs)
  }

  function seekReplay(progress: number) {
    if (!currentReplayLog.value) return
    const total = currentReplayLog.value.frames.length - 1
    if (total <= 0) return
    const index = Math.round((progress / 100) * total)
    currentReplayFrameIndex.value = Math.max(0, Math.min(total, index))
  }

  function setReplaySpeed(speed: number) {
    replaySpeed.value = Math.max(0.25, Math.min(4, speed))
    if (isReplayPlaying.value) {
      runReplayLoop()
    }
  }

  function stepForward() {
    if (!currentReplayLog.value) return
    const maxIndex = currentReplayLog.value.frames.length - 1
    currentReplayFrameIndex.value = Math.min(maxIndex, currentReplayFrameIndex.value + 1)
  }

  function stepBackward() {
    if (!currentReplayLog.value) return
    currentReplayFrameIndex.value = Math.max(0, currentReplayFrameIndex.value - 1)
  }

  function jumpToStart() {
    currentReplayFrameIndex.value = 0
  }

  function jumpToEnd() {
    if (!currentReplayLog.value) return
    currentReplayFrameIndex.value = currentReplayLog.value.frames.length - 1
  }

  function setFilterMode(mode: LogFilterMode) {
    filterMode.value = mode
  }

  function setSortBy(sort: LogSortBy) {
    sortBy.value = sort
  }

  function setDateRange(range: [number, number] | null) {
    dateRange.value = range
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function exportLogAsCSV(log: ObservationLog): string {
    const headers = [
      '时间',
      '观测纬度',
      '目标天体',
      '照准尺角度',
      '模拟高度',
      '测量高度',
      '测量误差',
      '当前步骤',
    ]

    const bodyName = log.finalResult.bodyName
    const rows = log.frames.map((frame) => {
      const time = new Date(frame.timestamp)
      const step = log.steps.find((s) => s.id === frame.currentStepId)
      return [
        time.toLocaleTimeString('zh-CN'),
        `${frame.latitude.toFixed(2)}°`,
        bodyName,
        `${frame.alidadeAngle.toFixed(2)}°`,
        `${frame.bodyAltitude.toFixed(2)}°`,
        `${frame.alidadeAngle.toFixed(2)}°`,
        `${(frame.alidadeAngle - frame.bodyAltitude).toFixed(2)}°`,
        step?.title || '',
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    return csvContent
  }

  function exportReportAsText(log: ObservationLog): string {
    const { finalResult, mode, startTime, duration } = log
    const startDate = new Date(startTime)
    const durationSec = (duration / 1000).toFixed(1)

    const report = [
      '========================================',
      '       航海星盘观测训练报告',
      '========================================',
      '',
      `模式: ${mode === 'practice' ? '练习模式' : mode === 'exam' ? '考核模式' : '导航模式'}`,
      `日期: ${startDate.toLocaleDateString('zh-CN')}`,
      `时间: ${startDate.toLocaleTimeString('zh-CN')}`,
      `用时: ${durationSec} 秒`,
      '',
      '----------------------------------------',
      '               观测结果',
      '----------------------------------------',
      `目标天体: ${finalResult.bodyName}`,
      `观测纬度: ${finalResult.latitude.toFixed(2)}°`,
      `模拟高度: ${finalResult.trueAltitude.toFixed(2)}°`,
      `测量高度: ${finalResult.measuredAltitude.toFixed(2)}°`,
      `测量误差: ${finalResult.measurementError >= 0 ? '+' : ''}${finalResult.measurementError.toFixed(2)}°`,
      '',
      '----------------------------------------',
      '               评分结果',
      '----------------------------------------',
      `得分: ${finalResult.score} 分`,
      `等级: ${finalResult.scoreGrade}`,
      '',
      '========================================',
    ].join('\n')

    return report
  }

  function exportAllStatsAsCSV(): string {
    const headers = ['序号', '模式', '日期', '目标天体', '得分', '等级', '误差(°)', '用时(秒)']
    const rows = filteredLogs.value.map((log, index) => {
      const date = new Date(log.startTime)
      return [
        index + 1,
        log.mode === 'practice' ? '练习' : log.mode === 'exam' ? '考核' : '导航',
        date.toLocaleString('zh-CN'),
        log.finalResult.bodyName,
        log.finalResult.score,
        log.finalResult.scoreGrade,
        log.finalResult.measurementError.toFixed(2),
        (log.duration / 1000).toFixed(1),
      ]
    })

    const summary = [
      '',
      '',
      '统计摘要',
      `总记录数: ${stats.value.totalCount}`,
      `练习记录: ${stats.value.practiceCount}`,
      `考核记录: ${stats.value.examCount}`,
      `练习平均分: ${stats.value.avgPracticeScore}`,
      `考核平均分: ${stats.value.avgExamScore}`,
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      ...summary,
    ].join('\n')

    return csvContent
  }

  return {
    logs,
    filteredLogs,
    stats,
    isRecording,
    currentRecordingId,
    isReplayMode,
    currentReplayLog,
    currentReplayFrameIndex,
    currentReplayFrame,
    isReplayPlaying,
    replaySpeed,
    replayProgress,
    replayTime,
    filterMode,
    sortBy,
    dateRange,
    searchQuery,
    startRecording,
    recordFrame,
    stopRecording,
    cancelRecording,
    deleteLog,
    clearAllLogs,
    startReplay,
    stopReplay,
    playReplay,
    pauseReplay,
    toggleReplayPlay,
    seekReplay,
    setReplaySpeed,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    setFilterMode,
    setSortBy,
    setDateRange,
    setSearchQuery,
    exportLogAsCSV,
    exportReportAsText,
    exportAllStatsAsCSV,
  }
})
