import {
  CELESTIAL_BODIES,
  type CelestialBody,
  type WeatherConditions,
  getCelestialBodyPosition,
  getSeason,
  isNightTime,
  calculateScore,
  getScoreGrade,
} from './astronomy'

export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type TaskStatus = 'idle' | 'active' | 'completed' | 'failed'

export type TaskType = 'single_measurement' | 'multiple_measurements' | 'navigation'

export interface TaskTarget {
  bodyId: string
  bodyName: string
  requiredAltitude?: number
  tolerance: number
  hint: string
}

export interface ChallengeTask {
  id: string
  title: string
  description: string
  type: TaskType
  difficulty: TaskDifficulty
  targets: TaskTarget[]
  timeLimit: number
  basePoints: number
  season: string
  weatherMultiplier: number
  latitudeMultiplier: number
  requirements: string[]
  tips: string[]
}

export interface TaskResult {
  taskId: string
  status: TaskStatus
  score: number
  grade: string
  totalError: number
  avgError: number
  timeUsed: number
  speedBonus: number
  accuracyBonus: number
  operationBonus: number
  comboMultiplier: number
  measurements: TaskMeasurementResult[]
  completedAt?: number
}

export interface TaskMeasurementResult {
  bodyId: string
  bodyName: string
  measuredAltitude: number
  trueAltitude: number
  error: number
  tolerance: number
  score: number
  isPassed: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  unlocked: boolean
  unlockedAt?: number
}

export interface LeaderboardEntry {
  rank: number
  playerName: string
  totalScore: number
  tasksCompleted: number
  perfectCount: number
  maxCombo: number
  bestStreak: number
}

export interface PlayerStats {
  totalScore: number
  tasksCompleted: number
  tasksFailed: number
  perfectCount: number
  currentStreak: number
  bestStreak: number
  currentCombo: number
  maxCombo: number
  totalTimePlayed: number
  avgScore: number
  avgAccuracy: number
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_light',
    name: '初见星光',
    description: '完成第一个观测任务',
    icon: '⭐',
    rarity: 'common',
    points: 10,
    unlocked: false,
  },
  {
    id: 'streak_3',
    name: '三连星',
    description: '连续完成3个任务',
    icon: '🌟',
    rarity: 'common',
    points: 20,
    unlocked: false,
  },
  {
    id: 'streak_7',
    name: '北斗七星',
    description: '连续完成7个任务',
    icon: '✨',
    rarity: 'rare',
    points: 50,
    unlocked: false,
  },
  {
    id: 'streak_30',
    name: '银河守护',
    description: '连续完成30个任务',
    icon: '🌌',
    rarity: 'epic',
    points: 200,
    unlocked: false,
  },
  {
    id: 'perfect_10',
    name: '完美十连',
    description: '获得10次满分',
    icon: '💯',
    rarity: 'rare',
    points: 100,
    unlocked: false,
  },
  {
    id: 'speed_demon',
    name: '疾风观测',
    description: '在10秒内完成一个困难任务',
    icon: '⚡',
    rarity: 'rare',
    points: 80,
    unlocked: false,
  },
  {
    id: 'all_stars',
    name: '众星捧月',
    description: '观测过所有不同的天体',
    icon: '🌙',
    rarity: 'epic',
    points: 150,
    unlocked: false,
  },
  {
    id: 'night_owl',
    name: '夜行者',
    description: '在夜间完成20个任务',
    icon: '🦉',
    rarity: 'rare',
    points: 60,
    unlocked: false,
  },
  {
    id: 'winter_solstice',
    name: '冬至观星',
    description: '在冬季完成10个任务',
    icon: '❄️',
    rarity: 'rare',
    points: 50,
    unlocked: false,
  },
  {
    id: 'summer_triangle',
    name: '夏季大三角',
    description: '在夏季连续完成3个完美任务',
    icon: '☀️',
    rarity: 'rare',
    points: 70,
    unlocked: false,
  },
  {
    id: 'polar_master',
    name: '极地探险家',
    description: '在纬度60°以上完成5个任务',
    icon: '🧊',
    rarity: 'epic',
    points: 120,
    unlocked: false,
  },
  {
    id: 'equator_expert',
    name: '赤道行者',
    description: '在纬度±10°以内完成5个任务',
    icon: '🌴',
    rarity: 'epic',
    points: 120,
    unlocked: false,
  },
  {
    id: 'storm_watcher',
    name: '风暴观测者',
    description: '在恶劣天气下完成任务',
    icon: '⛈️',
    rarity: 'rare',
    points: 90,
    unlocked: false,
  },
  {
    id: 'legendary_navigator',
    name: '传奇航海家',
    description: '累计获得10000积分',
    icon: '🏆',
    rarity: 'legendary',
    points: 500,
    unlocked: false,
  },
]

const TASK_TITLES = {
  easy: ['初学者的第一颗星', '晨光中的观测', '入门练习', '简单的挑战', '热身任务'],
  medium: ['星际挑战', '精确测量', '进阶训练', '星空漫步', '认真时刻'],
  hard: ['精确打击', '暗夜行者', '极限挑战', '高手较量', '星光璀璨'],
  expert: ['大师之路', '传奇观测', '终极挑战', '星神试炼', '银河之巅'],
}

const TASK_DESCRIPTIONS = {
  easy: [
    '选择一颗明亮的天体，测量它的高度角。',
    '调整照准尺，对准目标天体完成测量。',
    '轻松的练习任务，熟悉观测流程。',
  ],
  medium: [
    '在限定时间内完成天体测量，注意精度。',
    '中度难度的观测任务，考验你的技巧。',
    '需要一定耐心和精度的挑战。',
  ],
  hard: [
    '高难度挑战！需要极高的精度和速度。',
    '恶劣条件下的观测任务，考验真正的实力。',
    '只有熟练的观测者才能完成的挑战。',
  ],
  expert: [
    '传说级任务！只有大师级观测者才能挑战成功。',
    '终极试炼，展示你全部的观测技艺。',
    '挑战极限，成为星空的主宰。',
  ],
}

const HINTS: Record<string, string[]> = {
  polaris: ['位于北极附近', '北半球全年可见', '寻找正北方向'],
  sun: ['白天可见', '东升西落', '正午时在正南'],
  sirius: ['夜空中最亮的星', '大犬座主星', '冬季更容易观测'],
  vega: ['夏季大三角之一', '天琴座主星', '夏季南方天空'],
  arcturus: ['牧夫座主星', '春季星空代表', '橙色的亮星'],
  capella: ['御夫座主星', '冬季星空', '靠近北天极'],
  rigel: ['猎户座参宿七', '蓝色超巨星', '冬季显著'],
  procyon: ['小犬座主星', '冬季大三角之一', '靠近天狼星'],
  betelgeuse: ['猎户座参宿四', '红色超巨星', '冬季代表'],
  antares: ['天蝎座心宿二', '红色的星', '夏季南方'],
  spica: ['室女座角宿一', '春季星空', '蓝色亮星'],
  altair: ['天鹰座牛郎星', '夏季大三角之一', '银河东侧'],
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getDifficultyParams(difficulty: TaskDifficulty): {
  timeLimit: number
  basePoints: number
  tolerance: number
  targetCount: number
} {
  switch (difficulty) {
    case 'easy':
      return { timeLimit: 120, basePoints: 50, tolerance: 5, targetCount: 1 }
    case 'medium':
      return { timeLimit: 90, basePoints: 100, tolerance: 3, targetCount: 1 }
    case 'hard':
      return { timeLimit: 60, basePoints: 200, tolerance: 1.5, targetCount: 2 }
    case 'expert':
      return { timeLimit: 45, basePoints: 400, tolerance: 0.8, targetCount: 3 }
  }
}

function getWeatherMultiplier(weather: WeatherConditions): number {
  const cloudFactor = weather.cloudCover / 100
  const windFactor = weather.windSpeed / 100
  const seaFactor = weather.seaState / 10

  const difficulty = cloudFactor * 0.4 + windFactor * 0.3 + seaFactor * 0.3
  return 1 + difficulty * 0.5
}

function getLatitudeMultiplier(latitude: number): number {
  const absLat = Math.abs(latitude)
  if (absLat < 10) return 1.3
  if (absLat < 30) return 1.1
  if (absLat < 60) return 1.0
  return 1.2
}

function getVisibleBodies(
  date: Date,
  latitude: number,
  longitude: number
): CelestialBody[] {
  const isNight = isNightTime(date, latitude, longitude)
  return CELESTIAL_BODIES.filter((body) => {
    if (isNight && body.id === 'sun') return false
    if (!isNight && body.id !== 'sun') return false
    const pos = getCelestialBodyPosition(body, date, latitude, longitude)
    return pos.altitude > 10
  })
}

export function generateTask(
  date: Date,
  latitude: number,
  longitude: number,
  weather: WeatherConditions,
  difficulty: TaskDifficulty = 'medium'
): ChallengeTask {
  const season = getSeason(date, latitude)
  const visibleBodies = getVisibleBodies(date, latitude, longitude)

  if (visibleBodies.length === 0) {
    return {
      id: generateId(),
      title: '暂无可见天体',
      description: '当前条件下没有可见的天体，请调整时间或地点。',
      type: 'single_measurement',
      difficulty,
      targets: [],
      timeLimit: 60,
      basePoints: 0,
      season,
      weatherMultiplier: getWeatherMultiplier(weather),
      latitudeMultiplier: getLatitudeMultiplier(latitude),
      requirements: [],
      tips: [],
    }
  }

  const params = getDifficultyParams(difficulty)
  const targetCount = Math.min(params.targetCount, visibleBodies.length)
  const shuffled = [...visibleBodies].sort(() => Math.random() - 0.5)
  const selectedBodies = shuffled.slice(0, targetCount)

  const targets: TaskTarget[] = selectedBodies.map((body) => {
    const pos = getCelestialBodyPosition(body, date, latitude, longitude)
    const bodyHints = HINTS[body.id] || ['仔细观察星空']
    return {
      bodyId: body.id,
      bodyName: body.name,
      requiredAltitude: Number(pos.altitude.toFixed(2)),
      tolerance: params.tolerance,
      hint: getRandomElement(bodyHints),
    }
  })

  const type: TaskType = targetCount >= 3 ? 'multiple_measurements' : 'single_measurement'

  const titles = TASK_TITLES[difficulty]
  const descriptions = TASK_DESCRIPTIONS[difficulty]

  const requirements = [
    `精度要求: 误差≤${params.tolerance}°`,
    `目标数量: ${targetCount}个`,
    `时间限制: ${params.timeLimit}秒`,
  ]

  const tips = [
    '调整好时间和纬度',
    '仔细选择目标天体',
    '慢慢旋转照准尺对准',
    '注意精度不要操之过急',
  ].sort(() => Math.random() - 0.5).slice(0, 2)

  return {
    id: generateId(),
    title: getRandomElement(titles),
    description: getRandomElement(descriptions),
    type,
    difficulty,
    targets,
    timeLimit: params.timeLimit,
    basePoints: params.basePoints,
    season,
    weatherMultiplier: getWeatherMultiplier(weather),
    latitudeMultiplier: getLatitudeMultiplier(latitude),
    requirements,
    tips,
  }
}

export function calculateTaskScore(
  task: ChallengeTask,
  measurements: TaskMeasurementResult[],
  timeUsed: number,
  combo: number
): TaskResult {
  const totalError = measurements.reduce((sum, m) => sum + Math.abs(m.error), 0)
  const avgError = measurements.length > 0 ? totalError / measurements.length : 0

  const allPassed = measurements.every((m) => m.isPassed)
  const status: TaskStatus = allPassed ? 'completed' : 'failed'

  if (!allPassed || measurements.length === 0) {
    return {
      taskId: task.id,
      status: 'failed',
      score: 0,
      grade: '不及格',
      totalError,
      avgError,
      timeUsed,
      speedBonus: 0,
      accuracyBonus: 0,
      operationBonus: 0,
      comboMultiplier: 1,
      measurements,
      completedAt: Date.now(),
    }
  }

  const accuracyScore = measurements.reduce((sum, m) => sum + m.score, 0) / measurements.length
  const baseScore = task.basePoints * (accuracyScore / 100)

  const timeRatio = Math.max(0, (task.timeLimit - timeUsed) / task.timeLimit)
  const speedBonus = baseScore * timeRatio * 0.3

  const perfectCount = measurements.filter((m) => Math.abs(m.error) <= 0.5).length
  const operationBonus = perfectCount * 10

  const comboMultiplier = 1 + Math.min(combo, 10) * 0.05

  let totalScore = (baseScore + speedBonus + operationBonus) * comboMultiplier
  totalScore = Math.round(totalScore * task.weatherMultiplier * task.latitudeMultiplier)
  totalScore = Math.max(0, totalScore)

  const grade = getScoreGrade(Math.round((totalScore / (task.basePoints * 1.5)) * 100))

  return {
    taskId: task.id,
    status,
    score: totalScore,
    grade,
    totalError,
    avgError,
    timeUsed,
    speedBonus: Math.round(speedBonus),
    accuracyBonus: Math.round(baseScore * (accuracyScore / 100)),
    operationBonus,
    comboMultiplier,
    measurements,
    completedAt: Date.now(),
  }
}

export function createMeasurementResult(
  body: CelestialBody,
  measuredAltitude: number,
  trueAltitude: number,
  tolerance: number
): TaskMeasurementResult {
  const error = measuredAltitude - trueAltitude
  const score = calculateScore(error)
  const isPassed = Math.abs(error) <= tolerance

  return {
    bodyId: body.id,
    bodyName: body.name,
    measuredAltitude,
    trueAltitude,
    error,
    tolerance,
    score,
    isPassed,
  }
}

export function checkAchievements(
  stats: PlayerStats,
  lastTask: TaskResult | null,
  lastTaskDifficulty: TaskDifficulty,
  isNight: boolean,
  season: string,
  latitude: number,
  weather: WeatherConditions,
  observedBodies: Set<string>
): Achievement[] {
  const newAchievements: Achievement[] = []
  const achList = [...ACHIEVEMENTS]

  function unlock(id: string) {
    const ach = achList.find((a) => a.id === id)
    if (ach && !ach.unlocked) {
      ach.unlocked = true
      ach.unlockedAt = Date.now()
      newAchievements.push({ ...ach })
    }
  }

  if (stats.tasksCompleted >= 1) unlock('first_light')
  if (stats.bestStreak >= 3) unlock('streak_3')
  if (stats.bestStreak >= 7) unlock('streak_7')
  if (stats.bestStreak >= 30) unlock('streak_30')
  if (stats.perfectCount >= 10) unlock('perfect_10')
  if (observedBodies.size >= CELESTIAL_BODIES.length - 1) unlock('all_stars')
  if (stats.totalScore >= 10000) unlock('legendary_navigator')
  if (Math.abs(latitude) >= 60 && stats.tasksCompleted >= 5) unlock('polar_master')
  if (Math.abs(latitude) <= 10 && stats.tasksCompleted >= 5) unlock('equator_expert')

  if (isNight && stats.tasksCompleted >= 20) unlock('night_owl')
  if (season === '冬季' && stats.tasksCompleted >= 10) unlock('winter_solstice')
  if (season === '夏季' && stats.bestStreak >= 3 && stats.perfectCount >= 3) unlock('summer_triangle')

  if (
    lastTask &&
    lastTask.status === 'completed' &&
    lastTaskDifficulty === 'hard' &&
    lastTask.timeUsed <= 10
  ) {
    unlock('speed_demon')
  }

  if (
    lastTask &&
    lastTask.status === 'completed' &&
    (weather.cloudCover >= 70 || weather.windSpeed >= 50 || weather.seaState >= 6)
  ) {
    unlock('storm_watcher')
  }

  return newAchievements
}

export function getDifficultyLabel(difficulty: TaskDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return '简单'
    case 'medium':
      return '中等'
    case 'hard':
      return '困难'
    case 'expert':
      return '专家'
  }
}

export function getDifficultyColor(difficulty: TaskDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return '#18a058'
    case 'medium':
      return '#2080f0'
    case 'hard':
      return '#f0a020'
    case 'expert':
      return '#d03050'
  }
}

export function getDifficultyTagType(
  difficulty: TaskDifficulty
): 'success' | 'info' | 'warning' | 'error' {
  switch (difficulty) {
    case 'easy':
      return 'success'
    case 'medium':
      return 'info'
    case 'hard':
      return 'warning'
    case 'expert':
      return 'error'
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function getInitialPlayerStats(): PlayerStats {
  return {
    totalScore: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    perfectCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    currentCombo: 0,
    maxCombo: 0,
    totalTimePlayed: 0,
    avgScore: 0,
    avgAccuracy: 0,
  }
}

export function getInitialAchievements(): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({ ...a }))
}

export function generateMockLeaderboard(): LeaderboardEntry[] {
  const names = ['星空猎人', '银河守望者', '北极星', '天狼星', '织女星', '观星者', '夜星灵', '航海家']
  return names.map((name, i) => ({
    rank: i + 1,
    playerName: name,
    totalScore: Math.floor(10000 - i * 800 + Math.random() * 300),
    tasksCompleted: Math.floor(50 - i * 5 + Math.random() * 10),
    perfectCount: Math.floor(20 - i * 2 + Math.random() * 5),
    maxCombo: Math.floor(15 - i + Math.random() * 3),
    bestStreak: Math.floor(20 - i * 2 + Math.random() * 5),
  }))
}
