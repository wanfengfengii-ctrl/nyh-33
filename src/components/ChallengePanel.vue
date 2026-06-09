<template>
  <div class="challenge-panel">
    <n-card :bordered="false" size="small" class="challenge-header">
      <n-space justify="space-between" align="center">
        <n-space align="center">
          <n-tag type="warning" size="large" round>🌟 星空挑战</n-tag>
          <n-tag :type="getDifficultyTagType(currentTask?.difficulty || 'easy')" size="small">
            {{ getDifficultyLabel(currentTask?.difficulty || 'easy') }}
          </n-tag>
        </n-space>
        <n-space>
          <n-tag type="info" size="small">
            🔥 连击 x{{ stats.currentCombo }}
          </n-tag>
          <n-tag type="success" size="small">
            🏆 {{ stats.totalScore }} 分
          </n-tag>
        </n-space>
      </n-space>
    </n-card>

    <n-card v-if="!currentTask" title="欢迎来到星空挑战" :bordered="false" size="small" style="margin-top: 12px">
      <n-space vertical size="medium" align="center">
        <n-text style="font-size: 48px">🌌</n-text>
        <n-text depth="3" style="text-align: center">
          选择难度开始你的星空观测之旅！
          <br />
          在限定时间内完成天体测量，挑战更高分数！
        </n-text>
        <n-space wrap justify="center" style="width: 100%">
          <n-button type="success" size="large" @click="onStartTask('easy')">
            简单模式
          </n-button>
          <n-button type="info" size="large" @click="onStartTask('medium')">
            中等模式
          </n-button>
          <n-button type="warning" size="large" @click="onStartTask('hard')">
            困难模式
          </n-button>
          <n-button type="error" size="large" @click="onStartTask('expert')">
            专家模式
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <template v-else>
      <n-card v-if="currentTaskStatus === 'idle'" :title="currentTask.title" :bordered="false" size="small" style="margin-top: 12px">
        <n-space vertical size="medium">
          <n-text depth="3">{{ currentTask.description }}</n-text>

          <n-divider />

          <div>
            <n-tag type="info" style="margin-bottom: 8px">任务目标</n-tag>
            <n-space vertical size="small">
              <div v-for="(target, idx) in currentTask.targets" :key="target.bodyId" class="target-item">
                <n-space>
                  <n-tag size="small">{{ idx + 1 }}</n-tag>
                  <span class="target-name">{{ target.bodyName }}</span>
                </n-space>
                <n-tag size="small" type="info" v-if="target.hint">
                  💡 {{ target.hint }}
                </n-tag>
              </div>
            </n-space>
          </div>

          <n-divider />

          <div>
            <n-tag type="warning" style="margin-bottom: 8px">完成条件</n-tag>
            <n-space vertical size="small">
              <div v-for="req in currentTask.requirements" :key="req" class="req-item">
                ✓ {{ req }}
              </div>
            </n-space>
          </div>

          <n-divider v-if="currentTask.tips.length > 0" />

          <div v-if="currentTask.tips.length > 0">
            <n-tag type="success" style="margin-bottom: 8px">小贴士</n-tag>
            <n-space vertical size="small">
              <div v-for="tip in currentTask.tips" :key="tip" class="tip-item">
                💡 {{ tip }}
              </div>
            </n-space>
          </div>

          <n-space style="margin-top: 8px">
            <n-button type="primary" size="large" @click="onStart" style="flex: 1">
              开始挑战
            </n-button>
            <n-button @click="onRegenerate" style="flex: 1">
              换一个
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card v-else-if="currentTaskStatus === 'active'" :title="currentTask.title" :bordered="false" size="small" style="margin-top: 12px">
        <n-space vertical size="medium">
          <div class="countdown-section">
            <n-space justify="space-between" align="center">
              <span class="countdown-label">剩余时间</span>
              <span :class="['countdown-value', { warning: timeRemaining < 10, danger: timeRemaining < 5 }]">
                {{ formatTime(timeRemaining) }}
              </span>
            </n-space>
            <n-progress
              type="line"
              :percentage="(timeRemaining / currentTask.timeLimit) * 100"
              :color="countdownColor"
              :show-indicator="false"
              style="margin-top: 8px"
            />
          </div>

          <n-divider />

          <div>
            <n-space justify="space-between" align="center" style="margin-bottom: 8px">
              <n-tag type="info">
                第 {{ currentTargetIndex + 1 }} / {{ currentTask.targets.length }} 个目标
              </n-tag>
              <n-tag type="success">
                连击 x{{ stats.currentCombo }}
              </n-tag>
            </n-space>
            <n-progress
              type="line"
              :percentage="progress"
              :color="'#2080f0'"
              :show-indicator="false"
            />
          </div>

          <n-divider />

          <div v-if="currentTarget" class="current-target">
            <n-space vertical size="small">
              <div class="target-header">
                <n-tag type="warning" size="large">🎯 当前目标</n-tag>
              </div>
              <n-text class="target-name-large">{{ currentTarget.bodyName }}</n-text>
              <n-text depth="3" class="target-hint">
                💡 {{ currentTarget.hint }}
              </n-text>
              <n-alert type="info" :show-icon="false" size="small">
                误差容忍度: ±{{ currentTarget.tolerance }}°
              </n-alert>
            </n-space>
          </div>

          <n-divider />

          <div>
            <n-tag type="info" style="margin-bottom: 8px">🔭 观测控制</n-tag>
            <n-space vertical size="small">
              <div>
                <n-space justify="space-between" style="margin-bottom: 4px">
                  <span class="control-label">目标天体</span>
                </n-space>
                <n-select
                  v-model:value="selectedBodyId"
                  :options="bodyOptions"
                  @update:value="onBodySelect"
                  size="small"
                />
              </div>
              <div>
                <n-space justify="space-between" style="margin-bottom: 4px">
                  <span class="control-label">照准尺角度</span>
                  <span class="control-value">{{ alidadeAngle.toFixed(1) }}°</span>
                </n-space>
                <n-slider
                  v-model:value="alidadeAngle"
                  :min="0"
                  :max="90"
                  :step="0.1"
                  @update:value="onAlidadeChange"
                  size="small"
                />
              </div>
              <div v-if="!isBodyVisible" style="margin-top: 4px">
                <n-alert type="warning" :show-icon="false" size="small">
                  该天体位于地平线以下
                </n-alert>
              </div>
            </n-space>
          </div>

          <n-divider />

          <div>
            <n-tag type="success" style="margin-bottom: 8px">操作提示</n-tag>
            <n-space vertical size="small">
              <div class="tip-item">1. 选择当前目标天体</div>
              <div class="tip-item">2. 调整照准尺对准目标</div>
              <div class="tip-item">3. 点击"提交测量"完成该目标</div>
            </n-space>
          </div>

          <n-button
            type="primary"
            size="large"
            :disabled="!canSubmit"
            @click="onSubmitMeasurement"
            style="margin-top: 8px"
          >
            提交测量
          </n-button>
        </n-space>
      </n-card>

      <n-card v-else-if="currentTaskStatus === 'completed' || currentTaskStatus === 'failed'" :title="currentTaskStatus === 'completed' ? '🎉 任务完成！' : '😢 任务失败'" :bordered="false" size="small" style="margin-top: 12px">
        <n-space vertical size="medium" align="center">
          <n-statistic
            :value="currentTaskResult?.score || 0"
            label="本次得分"
            :value-style="{ fontSize: '48px', color: currentTaskStatus === 'completed' ? '#18a058' : '#d03050' }"
          />
          <n-tag :type="currentTaskStatus === 'completed' ? 'success' : 'error'" size="large" style="font-size: 16px; padding: 8px 20px">
            {{ currentTaskResult?.grade }}
          </n-tag>

          <n-divider style="width: 100%" />

          <div class="score-breakdown" style="width: 100%">
            <n-space vertical size="small">
              <div class="score-row">
                <span class="score-label">基础分</span>
                <span class="score-value">{{ currentTaskResult?.accuracyBonus || 0 }}</span>
              </div>
              <div class="score-row">
                <span class="score-label">速度奖励</span>
                <span class="score-value bonus">+{{ currentTaskResult?.speedBonus || 0 }}</span>
              </div>
              <div class="score-row">
                <span class="score-label">操作奖励</span>
                <span class="score-value bonus">+{{ currentTaskResult?.operationBonus || 0 }}</span>
              </div>
              <div class="score-row">
                <span class="score-label">连击加成</span>
                <span class="score-value bonus">x{{ currentTaskResult?.comboMultiplier?.toFixed(2) || '1.00' }}</span>
              </div>
              <div class="score-row">
                <span class="score-label">天气加成</span>
                <span class="score-value bonus">x{{ currentTask?.weatherMultiplier?.toFixed(2) || '1.00' }}</span>
              </div>
            </n-space>
          </div>

          <n-divider style="width: 100%" />

          <div style="width: 100%">
            <n-tag type="info" style="margin-bottom: 8px">测量详情</n-tag>
            <n-space vertical size="small">
              <div v-for="m in currentTaskResult?.measurements" :key="m.bodyId" class="measurement-item">
                <n-space justify="space-between" style="width: 100%">
                  <n-space>
                    <n-tag :type="m.isPassed ? 'success' : 'error'" size="small">
                      {{ m.isPassed ? '✓' : '✗' }}
                    </n-tag>
                    <span>{{ m.bodyName }}</span>
                  </n-space>
                  <span :class="m.isPassed ? 'passed' : 'failed'">
                    误差: {{ m.error >= 0 ? '+' : '' }}{{ m.error.toFixed(2) }}°
                  </span>
                </n-space>
              </div>
            </n-space>
          </div>

          <n-space style="width: 100%; margin-top: 8px">
            <n-button type="primary" size="large" @click="onNext" style="flex: 1">
              下一关
            </n-button>
            <n-button @click="onRetry" style="flex: 1">
              重试
            </n-button>
          </n-space>

          <n-space style="width: 100%">
            <n-button type="info" size="small" @click="onChangeDifficulty('easy')" style="flex: 1">
              简单
            </n-button>
            <n-button type="info" size="small" @click="onChangeDifficulty('medium')" style="flex: 1">
              中等
            </n-button>
            <n-button type="warning" size="small" @click="onChangeDifficulty('hard')" style="flex: 1">
              困难
            </n-button>
            <n-button type="error" size="small" @click="onChangeDifficulty('expert')" style="flex: 1">
              专家
            </n-button>
          </n-space>
        </n-space>
      </n-card>
    </template>

    <n-card title="📊 我的统计" :bordered="false" size="small" style="margin-top: 12px">
      <n-space vertical size="small">
        <div class="stat-row">
          <span class="stat-label">总积分</span>
          <span class="stat-value highlight">{{ stats.totalScore }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">完成任务</span>
          <span class="stat-value">{{ stats.tasksCompleted }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">失败任务</span>
          <span class="stat-value">{{ stats.tasksFailed }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">完美次数</span>
          <span class="stat-value">{{ stats.perfectCount }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">当前连胜</span>
          <span class="stat-value">{{ stats.currentStreak }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">最高连胜</span>
          <span class="stat-value highlight">{{ stats.bestStreak }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">最高连击</span>
          <span class="stat-value highlight">{{ stats.maxCombo }}</span>
        </div>
      </n-space>
    </n-card>

    <transition name="achievement-toast">
      <div v-if="newAchievementToast" class="achievement-toast">
        <n-card :bordered="false" size="small">
          <n-space align="center">
            <span style="font-size: 32px">{{ newAchievementToast.icon }}</span>
            <n-space vertical size="small">
              <n-text strong>🏆 成就解锁！</n-text>
              <n-text>{{ newAchievementToast.name }}</n-text>
              <n-text depth="3" style="font-size: 12px">
                +{{ newAchievementToast.points }} 积分
              </n-text>
            </n-space>
          </n-space>
        </n-card>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NDivider,
  NText,
  NButton,
  NProgress,
  NAlert,
  NStatistic,
  NSelect,
  NSlider,
  useMessage,
} from 'naive-ui'
import { useChallengeStore } from '../stores/challenge'
import { useAstrolabeStore } from '../stores/astrolabe'
import { storeToRefs } from 'pinia'
import {
  getDifficultyLabel,
  getDifficultyTagType,
  formatTime,
} from '../utils/challenge'
import type { TaskDifficulty } from '../utils/challenge'
import { CELESTIAL_BODIES } from '../utils/astronomy'
import type { SelectOption } from 'naive-ui'

const message = useMessage()
const challengeStore = useChallengeStore()
const astrolabeStore = useAstrolabeStore()

const {
  currentTask,
  currentTaskStatus,
  currentTaskResult,
  timeRemaining,
  currentTargetIndex,
  progress,
  stats,
  newAchievementToast,
  currentTarget,
} = storeToRefs(challengeStore)

const { selectedBody, bodyPosition, measuredAltitude, isBodyVisible } = storeToRefs(astrolabeStore)

const selectedBodyId = ref(selectedBody.value.id)
const alidadeAngle = ref(measuredAltitude.value)

const bodyOptions = computed<SelectOption[]>(() => {
  return CELESTIAL_BODIES.map((body) => ({
    label: body.name,
    value: body.id,
  }))
})

watch(selectedBody, (newBody) => {
  selectedBodyId.value = newBody.id
})

watch(measuredAltitude, (newAlt) => {
  alidadeAngle.value = newAlt
})

function onBodySelect(value: string | number | null) {
  if (typeof value === 'string') {
    astrolabeStore.selectBody(value)
  }
}

function onAlidadeChange(value: number) {
  astrolabeStore.setAlidadeAngle(value)
}

const canSubmit = computed(() => {
  if (!currentTarget.value) return false
  if (!isBodyVisible.value) return false
  return selectedBody.value.id === currentTarget.value.bodyId
})

const countdownColor = computed(() => {
  if (timeRemaining.value < 5) return '#d03050'
  if (timeRemaining.value < 10) return '#f0a020'
  return '#18a058'
})

function onStartTask(difficulty: TaskDifficulty) {
  challengeStore.generateNewTask(difficulty)
}

function onStart() {
  if (currentTask.value?.targets.length === 0) {
    message.warning('当前没有可见的天体目标，请调整时间或地点')
    return
  }
  challengeStore.startTask()
  message.success('挑战开始！')
}

function onRegenerate() {
  const diff = currentTask.value?.difficulty || 'medium'
  challengeStore.generateNewTask(diff)
}

function onSubmitMeasurement() {
  if (!currentTarget.value) return

  const body = CELESTIAL_BODIES.find((b) => b.id === currentTarget.value!.bodyId)
  if (!body) return

  const result = challengeStore.submitMeasurement(
    selectedBody.value,
    measuredAltitude.value,
    bodyPosition.value.altitude
  )

  if (result) {
    if (result.isPassed) {
      message.success(`${result.bodyName} 测量完成！误差: ${result.error.toFixed(2)}°`)
    } else {
      message.warning(`${result.bodyName} 误差过大: ${result.error.toFixed(2)}°`)
    }
  }
}

function onNext() {
  challengeStore.nextTask()
}

function onRetry() {
  challengeStore.retryTask()
}

function onChangeDifficulty(difficulty: TaskDifficulty) {
  challengeStore.nextTask(difficulty)
}
</script>

<style scoped>
.challenge-panel {
  width: 100%;
}

.challenge-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.countdown-section {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.countdown-label {
  font-size: 14px;
  color: #666;
}

.countdown-value {
  font-family: monospace;
  font-size: 28px;
  font-weight: bold;
  color: #18a058;
}

.countdown-value.warning {
  color: #f0a020;
}

.countdown-value.danger {
  color: #d03050;
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.target-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 6px;
}

.target-name {
  font-weight: 500;
}

.req-item,
.tip-item {
  font-size: 13px;
  color: #666;
  padding: 4px 0;
}

.current-target {
  padding: 16px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border-radius: 8px;
  text-align: center;
}

.target-header {
  justify-content: center;
}

.target-name-large {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.target-hint {
  font-size: 13px;
}

.score-breakdown {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
}

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.score-label {
  font-size: 13px;
  color: #666;
}

.score-value {
  font-family: monospace;
  font-weight: 600;
}

.score-value.bonus {
  color: #18a058;
}

.measurement-item {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 6px;
}

.measurement-item .passed {
  color: #18a058;
  font-family: monospace;
  font-size: 13px;
}

.measurement-item .failed {
  color: #d03050;
  font-family: monospace;
  font-size: 13px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.stat-value {
  font-family: monospace;
  font-weight: 600;
  font-size: 14px;
}

.stat-value.highlight {
  color: #2080f0;
}

.achievement-toast {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

.achievement-toast-enter-active,
.achievement-toast-leave-active {
  transition: all 0.3s ease;
}

.achievement-toast-enter-from,
.achievement-toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.control-label {
  font-size: 13px;
  color: #666;
}

.control-value {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: #2080f0;
}
</style>
