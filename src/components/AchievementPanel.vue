<template>
  <div class="achievement-panel">
    <n-card title="🏆 成就徽章" :bordered="false" size="small">
      <n-space vertical size="small">
        <div class="achievement-summary">
          <n-space justify="space-between" align="center">
            <span class="summary-label">已解锁</span>
            <n-tag type="success" size="large">
              {{ unlockedCount }} / {{ achievements.length }}
            </n-tag>
          </n-space>
          <n-progress
            type="line"
            :percentage="(unlockedCount / achievements.length) * 100"
            :show-indicator="false"
            style="margin-top: 8px"
            color="#f0a020"
          />
        </div>

        <n-space style="width: 100%">
          <n-tag type="success" size="small">
            总成就积分: {{ achievementPoints }}
          </n-tag>
        </n-space>
      </n-space>
    </n-card>

    <n-card title="成就列表" :bordered="false" size="small" style="margin-top: 12px">
      <n-space vertical size="small">
        <div
          v-for="achievement in sortedAchievements"
          :key="achievement.id"
          :class="['achievement-item', { locked: !achievement.unlocked }]"
        >
          <n-space align="center">
            <span class="achievement-icon">{{ achievement.icon }}</span>
            <n-space vertical size="small" style="flex: 1">
              <n-space justify="space-between" align="center">
                <n-text strong :class="{ 'text-locked': !achievement.unlocked }">
                  {{ achievement.name }}
                </n-text>
                <n-tag :type="getRarityTagType(achievement.rarity)" size="small">
                  {{ getRarityLabel(achievement.rarity) }}
                </n-tag>
              </n-space>
              <n-text depth="3" style="font-size: 12px">
                {{ achievement.description }}
              </n-text>
              <n-space justify="space-between" align="center">
                <n-tag size="small" type="info">
                  +{{ achievement.points }} 积分
                </n-tag>
                <n-text v-if="achievement.unlocked" depth="3" style="font-size: 11px">
                  {{ formatDate(achievement.unlockedAt) }}
                </n-text>
                <n-text v-else depth="3" style="font-size: 11px">
                  未解锁
                </n-text>
              </n-space>
            </n-space>
          </n-space>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NText,
  NProgress,
} from 'naive-ui'
import { useChallengeStore } from '../stores/challenge'
import { storeToRefs } from 'pinia'

const challengeStore = useChallengeStore()
const { achievements, achievementPoints } = storeToRefs(challengeStore)

const unlockedCount = computed(() =>
  achievements.value.filter((a) => a.unlocked).length
)

const sortedAchievements = computed(() => {
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 }
  return [...achievements.value].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1
    if (!a.unlocked && b.unlocked) return 1
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })
})

function getRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'common': return '普通'
    case 'rare': return '稀有'
    case 'epic': return '史诗'
    case 'legendary': return '传说'
    default: return rarity
  }
}

function getRarityTagType(
  rarity: string
): 'success' | 'info' | 'warning' | 'error' {
  switch (rarity) {
    case 'common': return 'info'
    case 'rare': return 'success'
    case 'epic': return 'warning'
    case 'legendary': return 'error'
    default: return 'info'
  }
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.achievement-summary {
  padding: 8px 0;
}

.summary-label {
  font-size: 13px;
  color: #666;
}

.achievement-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #18a058;
}

.achievement-item.locked {
  opacity: 0.5;
  border-left-color: #ccc;
  filter: grayscale(100%);
}

.achievement-icon {
  font-size: 32px;
}

.text-locked {
  color: #999;
}
</style>
