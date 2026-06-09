import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  type ChallengeTask,
  type TaskResult,
  type TaskMeasurementResult,
  type Achievement,
  type PlayerStats,
  type LeaderboardEntry,
  type TaskDifficulty,
  type TaskStatus,
  generateTask,
  calculateTaskScore,
  createMeasurementResult,
  checkAchievements,
  getInitialPlayerStats,
  getInitialAchievements,
  generateMockLeaderboard,
} from '../utils/challenge'
import { useAstrolabeStore } from './astrolabe'
import type { CelestialBody } from '../utils/astronomy'

const STORAGE_KEY_STATS = 'challenge_stats'
const STORAGE_KEY_ACHIEVEMENTS = 'challenge_achievements'
const STORAGE_KEY_OBSERVED = 'challenge_observed_bodies'

function loadStatsFromStorage(): PlayerStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STATS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
  return getInitialPlayerStats()
}

function saveStatsToStorage(stats: PlayerStats) {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats))
  } catch (e) {
    console.error('Failed to save stats:', e)
  }
}

function loadAchievementsFromStorage(): Achievement[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load achievements:', e)
  }
  return getInitialAchievements()
}

function saveAchievementsToStorage(achievements: Achievement[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(achievements))
  } catch (e) {
    console.error('Failed to save achievements:', e)
  }
}

function loadObservedBodiesFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_OBSERVED)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load observed bodies:', e)
  }
  return []
}

function saveObservedBodiesToStorage(bodies: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_OBSERVED, JSON.stringify(bodies))
  } catch (e) {
    console.error('Failed to save observed bodies:', e)
  }
}

export const useChallengeStore = defineStore('challenge', () => {
  const currentTask = ref<ChallengeTask | null>(null)
  const currentTaskStatus = ref<TaskStatus>('idle')
  const currentTaskResult = ref<TaskResult | null>(null)
  const timeRemaining = ref(0)
  const taskMeasurements = ref<TaskMeasurementResult[]>([])
  const currentTargetIndex = ref(0)
  const timerInterval = ref<number | null>(null)
  const taskStartTime = ref(0)

  const stats = ref<PlayerStats>(loadStatsFromStorage())
  const achievements = ref<Achievement[]>(loadAchievementsFromStorage())
  const observedBodies = ref<Set<string>>(new Set(loadObservedBodiesFromStorage()))

  const newAchievementToast = ref<Achievement | null>(null)
  const leaderboard = ref<LeaderboardEntry[]>(generateMockLeaderboard())

  const isChallengeMode = ref(false)

  const isTaskActive = computed(() => currentTaskStatus.value === 'active')
  const isTaskCompleted = computed(() => currentTaskStatus.value === 'completed')
  const isTaskFailed = computed(() => currentTaskStatus.value === 'failed')
  const hasTask = computed(() => currentTask.value !== null)

  const currentTarget = computed(() => {
    if (!currentTask.value || currentTargetIndex.value >= currentTask.value.targets.length) {
      return null
    }
    return currentTask.value.targets[currentTargetIndex.value]
  })

  const progress = computed(() => {
    if (!currentTask.value || currentTask.value.targets.length === 0) return 0
    return (currentTargetIndex.value / currentTask.value.targets.length) * 100
  })

  const unlockedAchievements = computed(() =>
    achievements.value.filter((a) => a.unlocked)
  )

  const achievementPoints = computed(() =>
    unlockedAchievements.value.reduce((sum, a) => sum + a.points, 0)
  )

  function startChallenge() {
    isChallengeMode.value = true
    generateNewTask('easy')
  }

  function exitChallenge() {
    isChallengeMode.value = false
    stopTimer()
    currentTask.value = null
    currentTaskStatus.value = 'idle'
    currentTaskResult.value = null
    taskMeasurements.value = []
    currentTargetIndex.value = 0
  }

  function generateNewTask(difficulty: TaskDifficulty) {
    const astrolabeStore = useAstrolabeStore()
    const task = generateTask(
      astrolabeStore.date,
      astrolabeStore.latitude,
      astrolabeStore.longitude,
      astrolabeStore.weather,
      difficulty
    )

    currentTask.value = task
    currentTaskStatus.value = 'idle'
    currentTaskResult.value = null
    taskMeasurements.value = []
    currentTargetIndex.value = 0
    timeRemaining.value = task.timeLimit
  }

  function startTask() {
    if (!currentTask.value || currentTask.value.targets.length === 0) return

    currentTaskStatus.value = 'active'
    taskStartTime.value = Date.now()
    timeRemaining.value = currentTask.value.timeLimit
    taskMeasurements.value = []
    currentTargetIndex.value = 0
    startTimer()

    const astrolabeStore = useAstrolabeStore()
    const firstTarget = currentTask.value.targets[0]
    if (firstTarget) {
      astrolabeStore.selectBody(firstTarget.bodyId)
    }
  }

  function startTimer() {
    stopTimer()
    timerInterval.value = window.setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value -= 0.1
        if (timeRemaining.value <= 0) {
          timeRemaining.value = 0
          failTask()
        }
      }
    }, 100)
  }

  function stopTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  }

  function submitMeasurement(
    body: CelestialBody,
    measuredAltitude: number,
    trueAltitude: number
  ) {
    if (!currentTask.value || currentTaskStatus.value !== 'active') return null

    const target = currentTarget.value
    if (!target) return null

    const measurement = createMeasurementResult(
      body,
      measuredAltitude,
      trueAltitude,
      target.tolerance
    )

    taskMeasurements.value.push(measurement)
    observedBodies.value.add(body.id)
    saveObservedBodiesToStorage([...observedBodies.value])

    if (currentTargetIndex.value < currentTask.value.targets.length - 1) {
      currentTargetIndex.value++
      const astrolabeStore = useAstrolabeStore()
      const nextTarget = currentTask.value.targets[currentTargetIndex.value]
      if (nextTarget) {
        astrolabeStore.selectBody(nextTarget.bodyId)
      }
    } else {
      completeTask()
    }

    return measurement
  }

  function completeTask() {
    if (!currentTask.value) return

    stopTimer()
    const timeUsed = currentTask.value.timeLimit - timeRemaining.value

    const result = calculateTaskScore(
      currentTask.value,
      taskMeasurements.value,
      timeUsed,
      stats.value.currentCombo
    )

    currentTaskResult.value = result
    currentTaskStatus.value = result.status

    updateStats(result)
    checkAndUnlockAchievements()
  }

  function failTask() {
    if (!currentTask.value) return

    stopTimer()
    const timeUsed = currentTask.value.timeLimit

    const result: TaskResult = {
      taskId: currentTask.value.id,
      status: 'failed',
      score: 0,
      grade: '不及格',
      totalError: 0,
      avgError: 0,
      timeUsed,
      speedBonus: 0,
      accuracyBonus: 0,
      operationBonus: 0,
      comboMultiplier: 1,
      measurements: taskMeasurements.value,
      completedAt: Date.now(),
    }

    currentTaskResult.value = result
    currentTaskStatus.value = 'failed'

    updateStats(result)
  }

  function updateStats(result: TaskResult) {
    const isCompleted = result.status === 'completed'
    const isPerfect = isCompleted && result.score >= 95

    if (isCompleted) {
      stats.value.tasksCompleted++
      stats.value.currentStreak++
      stats.value.currentCombo++
      stats.value.maxCombo = Math.max(stats.value.maxCombo, stats.value.currentCombo)
      stats.value.bestStreak = Math.max(stats.value.bestStreak, stats.value.currentStreak)

      if (isPerfect) {
        stats.value.perfectCount++
      }
    } else {
      stats.value.tasksFailed++
      stats.value.currentStreak = 0
      stats.value.currentCombo = 0
    }

    stats.value.totalScore += result.score
    stats.value.totalTimePlayed += result.timeUsed

    if (stats.value.tasksCompleted > 0) {
      stats.value.avgScore = Math.round(
        stats.value.totalScore / stats.value.tasksCompleted
      )
    }

    saveStatsToStorage(stats.value)
  }

  function checkAndUnlockAchievements() {
    const astrolabeStore = useAstrolabeStore()

    const newOnes = checkAchievements(
      stats.value,
      currentTaskResult.value,
      currentTask.value?.difficulty || 'medium',
      astrolabeStore.isNight,
      currentTask.value?.season || '春季',
      astrolabeStore.latitude,
      astrolabeStore.weather,
      observedBodies.value
    )

    for (const newAch of newOnes) {
      const existing = achievements.value.find((a) => a.id === newAch.id)
      if (existing && !existing.unlocked) {
        existing.unlocked = true
        existing.unlockedAt = newAch.unlockedAt
        newAchievementToast.value = existing
        setTimeout(() => {
          newAchievementToast.value = null
        }, 3000)
      }
    }

    saveAchievementsToStorage(achievements.value)
  }

  function nextTask(difficulty?: TaskDifficulty) {
    const diff = difficulty || currentTask.value?.difficulty || 'medium'
    generateNewTask(diff)
  }

  function retryTask() {
    if (!currentTask.value) return
    currentTaskStatus.value = 'idle'
    currentTaskResult.value = null
    taskMeasurements.value = []
    currentTargetIndex.value = 0
    timeRemaining.value = currentTask.value.timeLimit
  }

  function selectTaskTarget(bodyId: string) {
    if (!currentTask.value) return false
    const target = currentTask.value.targets.find((t) => t.bodyId === bodyId)
    return target !== undefined
  }

  function getPlayerRank(): number {
    const sorted = [...leaderboard.value].sort((a, b) => b.totalScore - a.totalScore)
    const playerScore = stats.value.totalScore + achievementPoints.value
    let rank = 1
    for (const entry of sorted) {
      if (entry.totalScore > playerScore) rank++
    }
    return rank
  }

  function resetAllData() {
    stats.value = getInitialPlayerStats()
    achievements.value = getInitialAchievements()
    observedBodies.value = new Set()
    saveStatsToStorage(stats.value)
    saveAchievementsToStorage(achievements.value)
    saveObservedBodiesToStorage([])
  }

  return {
    currentTask,
    currentTaskStatus,
    currentTaskResult,
    timeRemaining,
    taskMeasurements,
    currentTargetIndex,
    stats,
    achievements,
    observedBodies,
    newAchievementToast,
    leaderboard,
    isChallengeMode,
    isTaskActive,
    isTaskCompleted,
    isTaskFailed,
    hasTask,
    currentTarget,
    progress,
    unlockedAchievements,
    achievementPoints,
    startChallenge,
    exitChallenge,
    generateNewTask,
    startTask,
    submitMeasurement,
    completeTask,
    failTask,
    nextTask,
    retryTask,
    selectTaskTarget,
    getPlayerRank,
    resetAllData,
  }
})
