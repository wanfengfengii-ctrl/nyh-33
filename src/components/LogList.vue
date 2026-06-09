<template>
  <div class="log-panel">
    <n-card title="航海日志" :bordered="false" size="small">
      <n-space vertical size="small" style="width: 100%">
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-value">{{ stats.totalCount }}</span>
            <span class="stat-label">总记录</span>
          </div>
          <div class="stat-item">
            <span class="stat-value practice">{{ stats.practiceCount }}</span>
            <span class="stat-label">练习</span>
          </div>
          <div class="stat-item">
            <span class="stat-value exam">{{ stats.examCount }}</span>
            <span class="stat-label">考核</span>
          </div>
        </div>

        <n-divider style="margin: 8px 0" />

        <n-space size="small">
          <n-radio-group v-model:value="filterModeValue" size="small" @update:value="onFilterModeChange">
            <n-radio-button value="all">全部</n-radio-button>
            <n-radio-button value="practice">练习</n-radio-button>
            <n-radio-button value="exam">考核</n-radio-button>
          </n-radio-group>
        </n-space>

        <n-select
          v-model:value="sortByValue"
          :options="sortOptions"
          size="small"
          @update:value="onSortChange"
          style="width: 100%"
        />

        <n-input
          v-model:value="searchValue"
          placeholder="搜索日志..."
          size="small"
          clearable
          @update:value="onSearchChange"
        />

        <n-divider style="margin: 8px 0" />

        <div class="log-list" v-if="filteredLogs.length > 0">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="log-item"
            :class="{ active: currentReplayLog?.id === log.id }"
            @click="onReplayLog(log.id)"
          >
            <div class="log-header">
              <n-tag :type="getModeTagType(log.mode)" size="small">
                {{ log.mode === 'practice' ? '练习' : log.mode === 'exam' ? '考核' : '导航' }}
              </n-tag>
              <span class="log-score" :class="getScoreClass(log.finalResult.score)">
                {{ log.finalResult.score }}分
              </span>
            </div>
            <div class="log-title">{{ log.finalResult.bodyName }}观测</div>
            <div class="log-meta">
              <span>{{ formatDate(log.startTime) }}</span>
              <span>{{ (log.duration / 1000).toFixed(1) }}s</span>
            </div>
            <div class="log-actions">
              <n-button size="tiny" type="primary" @click.stop="onReplayLog(log.id)">
                回放
              </n-button>
              <n-button size="tiny" @click.stop="onExportReport(log)">
                导出
              </n-button>
              <n-button size="tiny" type="error" @click.stop="onDeleteLog(log.id)">
                删除
              </n-button>
            </div>
          </div>
        </div>

        <n-empty v-else description="暂无日志记录" size="small" />

        <n-divider style="margin: 8px 0" />

        <n-space justify="space-between">
          <n-button size="small" @click="onExportAll">
            导出全部
          </n-button>
          <n-button size="small" type="error" @click="onClearAll">
            清空日志
          </n-button>
        </n-space>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  NCard,
  NSpace,
  NDivider,
  NRadioGroup,
  NRadioButton,
  NSelect,
  NInput,
  NTag,
  NButton,
  NEmpty,
  useMessage,
} from 'naive-ui'
import { useLogStore, type ObservationLog, type LogFilterMode, type LogSortBy } from '../stores/log'
import { storeToRefs } from 'pinia'
import type { SelectOption } from 'naive-ui'

const emit = defineEmits<{
  (e: 'replay', logId: string): void
}>()

const message = useMessage()
const logStore = useLogStore()
const { filteredLogs, stats, currentReplayLog } = storeToRefs(logStore)

const filterModeValue = ref<LogFilterMode>('all')
const sortByValue = ref<LogSortBy>('date')
const searchValue = ref('')

const sortOptions: SelectOption[] = [
  { label: '按日期排序', value: 'date' },
  { label: '按分数排序', value: 'score' },
  { label: '按时长排序', value: 'duration' },
]

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function getModeTagType(mode: string): 'success' | 'warning' | 'info' {
  switch (mode) {
    case 'practice':
      return 'success'
    case 'exam':
      return 'warning'
    default:
      return 'info'
  }
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 60) return 'warning'
  return 'error'
}

function onFilterModeChange(value: LogFilterMode) {
  logStore.setFilterMode(value)
}

function onSortChange(value: string | number | null) {
  if (typeof value === 'string') {
    logStore.setSortBy(value as LogSortBy)
  }
}

function onSearchChange(value: string) {
  logStore.setSearchQuery(value)
}

function onReplayLog(logId: string) {
  emit('replay', logId)
}

function onDeleteLog(logId: string) {
  if (confirm('确定要删除这条日志吗？')) {
    logStore.deleteLog(logId)
    message.success('日志已删除')
  }
}

function onExportReport(log: ObservationLog) {
  const report = logStore.exportReportAsText(log)
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date(log.startTime).toISOString().slice(0, 10)
  a.download = `训练报告_${log.finalResult.bodyName}_${dateStr}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('报告已导出')
}

function onExportAll() {
  if (filteredLogs.value.length === 0) {
    message.warning('没有可导出的日志')
    return
  }
  const csv = logStore.exportAllStatsAsCSV()
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download = `航海日志统计_${dateStr}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('统计已导出')
}

function onClearAll() {
  if (confirm('确定要清空所有日志吗？此操作不可恢复！')) {
    logStore.clearAllLogs()
    message.success('日志已清空')
  }
}
</script>

<style scoped>
.log-panel {
  width: 320px;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  font-family: monospace;
  color: #333;
}

.stat-value.practice {
  color: #18a058;
}

.stat-value.exam {
  color: #f0a020;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.log-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.log-item:hover {
  border-color: #2080f0;
  background: #f0f7ff;
}

.log-item.active {
  border-color: #18a058;
  background: #f0fff4;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.log-score {
  font-weight: bold;
  font-family: monospace;
  font-size: 14px;
}

.log-score.excellent {
  color: #18a058;
}

.log-score.good {
  color: #2080f0;
}

.log-score.warning {
  color: #f0a020;
}

.log-score.error {
  color: #d03050;
}

.log-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.log-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.log-actions {
  display: flex;
  gap: 6px;
}

.log-actions .n-button {
  flex: 1;
}
</style>
