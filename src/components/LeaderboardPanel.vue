<template>
  <div class="leaderboard-panel">
    <n-card title="🏅 积分排行榜" :bordered="false" size="small">
      <n-space vertical size="medium">
        <div class="player-rank">
          <n-alert type="info" :show-icon="false">
            <n-space justify="space-between" align="center">
              <n-text>我的排名</n-text>
              <n-tag type="warning" size="large">
                第 {{ playerRank }} 名
              </n-tag>
            </n-space>
          </n-alert>
        </div>

        <n-space vertical size="small">
          <div
            v-for="entry in leaderboard"
            :key="entry.rank"
            :class="['rank-item', getRankClass(entry.rank)]"
          >
            <n-space align="center" style="width: 100%">
              <div class="rank-number">
                <span v-if="entry.rank <= 3" class="rank-medal">
                  {{ getMedalEmoji(entry.rank) }}
                </span>
                <span v-else class="rank-num">{{ entry.rank }}</span>
              </div>
              <n-space vertical size="small" style="flex: 1">
                <n-text strong>{{ entry.playerName }}</n-text>
                <n-space justify="space-between" style="width: 100%">
                  <n-text depth="3" style="font-size: 12px">
                    完成 {{ entry.tasksCompleted }} 个任务
                  </n-text>
                  <n-text depth="3" style="font-size: 12px">
                    完美 {{ entry.perfectCount }} 次
                  </n-text>
                </n-space>
              </n-space>
              <div class="rank-score">
                <n-tag type="success" size="large">
                  {{ entry.totalScore.toLocaleString() }}
                </n-tag>
              </div>
            </n-space>
          </div>
        </n-space>

        <n-divider />

        <div class="my-stats">
          <n-space vertical size="small">
            <n-space justify="space-between">
              <n-text depth="3">我的总积分</n-text>
              <n-text strong style="color: #f0a020">
                {{ myTotalScore.toLocaleString() }}
              </n-text>
            </n-space>
            <n-space justify="space-between">
              <n-text depth="3">完成任务</n-text>
              <n-text strong>{{ stats.tasksCompleted }} 个</n-text>
            </n-space>
            <n-space justify="space-between">
              <n-text depth="3">最高连胜</n-text>
              <n-text strong>{{ stats.bestStreak }} 连胜</n-text>
            </n-space>
            <n-space justify="space-between">
              <n-text depth="3">成就积分</n-text>
              <n-text strong style="color: #722ed1">
                +{{ achievementPoints }}
              </n-text>
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
  NAlert,
  NDivider,
} from 'naive-ui'
import { useChallengeStore } from '../stores/challenge'
import { storeToRefs } from 'pinia'

const challengeStore = useChallengeStore()
const { leaderboard, stats, achievementPoints } = storeToRefs(challengeStore)

const playerRank = computed(() => challengeStore.getPlayerRank())

const myTotalScore = computed(() =>
  stats.value.totalScore + achievementPoints.value
)

function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return ''
  }
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}
</script>

<style scoped>
.rank-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.rank-item.rank-gold {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%);
  border: 1px solid #faad14;
}

.rank-item.rank-silver {
  background: linear-gradient(135deg, #f5f5f5 0%, #d9d9d9 100%);
  border: 1px solid #bfbfbf;
}

.rank-item.rank-bronze {
  background: linear-gradient(135deg, #fff2e8 0%, #ffbb96 100%);
  border: 1px solid #fa8c16;
}

.rank-number {
  width: 36px;
  text-align: center;
}

.rank-medal {
  font-size: 24px;
}

.rank-num {
  font-size: 18px;
  font-weight: bold;
  color: #666;
}

.rank-score {
  min-width: 80px;
  text-align: right;
}

.player-rank {
  margin-bottom: 8px;
}

.my-stats {
  padding: 12px;
  background: #f0f5ff;
  border-radius: 8px;
}
</style>
