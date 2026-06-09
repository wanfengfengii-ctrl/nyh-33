<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import ControlPanel from './components/ControlPanel.vue'
import InfoPanel from './components/InfoPanel.vue'
import Astrolabe3D from './components/Astrolabe3D.vue'
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <div class="app-container">
        <header class="app-header">
          <h1 class="title">古航海星盘模拟器</h1>
          <p class="subtitle">Astrolabe Simulator</p>
        </header>

        <div class="app-main">
          <aside class="sider sider-left">
            <ControlPanel />
          </aside>

          <main class="content">
            <div class="astrolabe-wrapper">
              <Astrolabe3D />
            </div>
          </main>

          <aside class="sider sider-right">
            <InfoPanel />
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
</style>
