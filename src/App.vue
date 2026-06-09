<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NTabs, NTabPane, NButton } from 'naive-ui'
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import ControlPanel from './components/ControlPanel.vue'
import NavControlPanel from './components/NavControlPanel.vue'
import InfoPanel from './components/InfoPanel.vue'
import Astrolabe3D from './components/Astrolabe3D.vue'
import SeaChart from './components/SeaChart.vue'
import LogList from './components/LogList.vue'
import ReplayControl from './components/ReplayControl.vue'
import LogRecorder from './components/LogRecorder.vue'
import ChallengePanel from './components/ChallengePanel.vue'
import AchievementPanel from './components/AchievementPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'
import { useAstrolabeStore } from './stores/astrolabe'
import { useLogStore } from './stores/log'
import { useChallengeStore } from './stores/challenge'

const astrolabeStore = useAstrolabeStore()
const logStore = useLogStore()
const challengeStore = useChallengeStore()
const { mode } = storeToRefs(astrolabeStore)
const { isReplayMode } = storeToRefs(logStore)
const { isChallengeMode } = storeToRefs(challengeStore)

const isNavigationMode = computed(() => mode.value === 'navigation')
const rightTabValue = ref('info')

function onReplay(logId: string) {
  logStore.startReplay(logId)
  rightTabValue.value = 'replay'
}

function onExitReplay() {
  rightTabValue.value = 'log'
}

function onToggleChallenge() {
  if (isChallengeMode.value) {
    challengeStore.exitChallenge()
  } else {
    challengeStore.startChallenge()
  }
}
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <div class="app-container">
        <header class="app-header">
          <h1 class="title">{{ isNavigationMode ? '恒星导航定位系统' : isChallengeMode ? '星空任务挑战' : '古航海星盘模拟器' }}</h1>
          <p class="subtitle">{{ isNavigationMode ? 'Celestial Navigation System' : isChallengeMode ? 'Star Challenge' : 'Astrolabe Simulator' }}</p>
          <n-button
            v-if="!isNavigationMode"
            :type="isChallengeMode ? 'warning' : 'default'"
            size="small"
            @click="onToggleChallenge"
            style="margin-left: auto"
          >
            {{ isChallengeMode ? '退出挑战' : '🌟 星空挑战' }}
          </n-button>
        </header>

        <div class="app-main">
          <aside class="sider sider-left">
            <NavControlPanel v-if="isNavigationMode" />
            <ChallengePanel v-else-if="isChallengeMode" />
            <ControlPanel v-else />
          </aside>

          <main class="content">
            <div class="chart-wrapper" v-if="isNavigationMode">
              <SeaChart />
            </div>
            <div class="astrolabe-wrapper" v-else>
              <Astrolabe3D />
              <LogRecorder v-if="!isChallengeMode && !isNavigationMode" />
            </div>
          </main>

          <aside class="sider sider-right">
            <ReplayControl v-if="isReplayMode && !isNavigationMode && !isChallengeMode" @exit="onExitReplay" />
            <template v-else-if="isChallengeMode">
              <n-tabs v-model:value="rightTabValue" type="line" size="small" class="right-tabs">
                <n-tab-pane name="info" tab="测量信息">
                  <InfoPanel />
                </n-tab-pane>
                <n-tab-pane name="achievement" tab="🏆 成就">
                  <AchievementPanel />
                </n-tab-pane>
                <n-tab-pane name="leaderboard" tab="🏅 排行">
                  <LeaderboardPanel />
                </n-tab-pane>
              </n-tabs>
            </template>
            <template v-else>
              <n-tabs v-model:value="rightTabValue" type="line" size="small" class="right-tabs">
                <n-tab-pane name="info" :tab="isNavigationMode ? '航行信息' : '测量信息'">
                  <InfoPanel />
                </n-tab-pane>
                <n-tab-pane name="log" tab="航海日志">
                  <LogList @replay="onReplay" />
                </n-tab-pane>
              </n-tabs>
            </template>
          </aside>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  height: 70px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #ffd700;
  letter-spacing: 2px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #888;
  font-style: italic;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sider {
  width: 290px;
  flex-shrink: 0;
  background: #f5f5f5;
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
}

.sider-left {
  border-right: 1px solid #e0e0e0;
}

.sider-right {
  border-left: 1px solid #e0e0e0;
  width: 350px;
  padding: 8px;
}

.right-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.right-tabs :deep(.n-tabs-content) {
  flex: 1;
  overflow-y: auto;
}

.right-tabs :deep(.n-tabs-tab) {
  padding: 8px 16px;
}

.content {
  flex: 1;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
}

.astrolabe-wrapper {
  width: 100%;
  height: 100%;
  max-width: 700px;
  max-height: 700px;
  position: relative;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  max-width: 900px;
  max-height: 700px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
</style>
