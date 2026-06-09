<template>
  <div class="sea-chart-container" ref="containerRef">
    <canvas ref="canvasRef" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @wheel="onWheel"></canvas>
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-dot start"></span>
        <span>起始位置</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot dr"></span>
        <span>推算船位</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot fix"></span>
        <span>观测定位</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot true"></span>
        <span>真实位置</span>
      </div>
    </div>
    <div class="chart-info">
      <div class="info-item">
        <span class="label">比例尺:</span>
        <span class="value">{{ scaleLabel }}</span>
      </div>
      <div class="info-item">
        <span class="label">中心:</span>
        <span class="value">{{ centerLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useAstrolabeStore } from '../stores/astrolabe'
import { storeToRefs } from 'pinia'
import { formatLatitude, formatLongitude } from '../utils/astronomy'

const store = useAstrolabeStore()
const {
  navStartPosition,
  drPosition,
  navFixResult,
  navTruePosition,
  navObservations,
  navIsComplete,
  navShipHeading,
} = storeToRefs(store)

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

const centerLat = ref(35)
const centerLon = ref(122)
const scale = ref(50)

let isDragging = false
let lastMousePos = { x: 0, y: 0 }

const scaleLabel = computed(() => {
  const kmPerPixel = scale.value
  if (kmPerPixel < 1) return `${(kmPerPixel * 1000).toFixed(0)} m/px`
  return `${kmPerPixel.toFixed(1)} km/px`
})

const centerLabel = computed(() => {
  return `${formatLatitude(centerLat.value)}, ${formatLongitude(centerLon.value)}`
})

function initCanvas() {
  if (!canvasRef.value || !containerRef.value) return

  const canvas = canvasRef.value
  const container = containerRef.value

  canvas.width = container.clientWidth
  canvas.height = container.clientHeight

  ctx = canvas.getContext('2d')
  if (ctx) {
    drawChart()
  }
}

function latLonToPixel(lat: number, lon: number): { x: number; y: number } {
  if (!canvasRef.value) return { x: 0, y: 0 }

  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2
  const centerY = height / 2

  const kmPerDegreeLat = 111
  const kmPerDegreeLon = 111 * Math.cos((centerLat.value * Math.PI) / 180)

  const dLat = lat - centerLat.value
  const dLon = lon - centerLon.value

  const x = centerX + (dLon * kmPerDegreeLon) / scale.value
  const y = centerY - (dLat * kmPerDegreeLat) / scale.value

  return { x, y }
}

function drawGrid() {
  if (!ctx || !canvasRef.value) return

  const width = canvasRef.value.width
  const height = canvasRef.value.height

  ctx.fillStyle = '#0a1628'
  ctx.fillRect(0, 0, width, height)

  const gridSpacing = 1
  const kmPerDegreeLat = 111
  const pixelsPerDegreeLat = kmPerDegreeLat / scale.value

  const startLat = Math.floor(centerLat.value - (height / 2 / pixelsPerDegreeLat))
  const endLat = Math.ceil(centerLat.value + (height / 2 / pixelsPerDegreeLat))

  ctx.strokeStyle = 'rgba(100, 150, 200, 0.2)'
  ctx.lineWidth = 1

  for (let lat = startLat; lat <= endLat; lat += gridSpacing) {
    const { y } = latLonToPixel(lat, centerLon.value)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  const kmPerDegreeLon = 111 * Math.cos((centerLat.value * Math.PI) / 180)
  const pixelsPerDegreeLon = kmPerDegreeLon / scale.value

  const startLon = Math.floor(centerLon.value - (width / 2 / pixelsPerDegreeLon))
  const endLon = Math.ceil(centerLon.value + (width / 2 / pixelsPerDegreeLon))

  for (let lon = startLon; lon <= endLon; lon += gridSpacing) {
    const { x } = latLonToPixel(centerLat.value, lon)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(150, 200, 255, 0.5)'
  ctx.font = '11px monospace'

  for (let lat = startLat; lat <= endLat; lat += gridSpacing) {
    const { y } = latLonToPixel(lat, centerLon.value)
    const label = `${lat}°${lat >= 0 ? 'N' : 'S'}`
    ctx.fillText(label, 5, y - 3)
  }

  for (let lon = startLon; lon <= endLon; lon += gridSpacing) {
    const { x } = latLonToPixel(centerLat.value, lon)
    const label = `${lon}°${lon >= 0 ? 'E' : 'W'}`
    ctx.fillText(label, x + 3, 15)
  }
}

function drawLandmass() {
  if (!ctx) return

  ctx.fillStyle = 'rgba(80, 120, 60, 0.3)'
  ctx.strokeStyle = 'rgba(100, 150, 80, 0.5)'
  ctx.lineWidth = 1

  const landPatches = [
    { lat: 32, lon: 120, sizeLat: 8, sizeLon: 10 },
    { lat: 40, lon: 125, sizeLat: 5, sizeLon: 6 },
    { lat: 25, lon: 118, sizeLat: 4, sizeLon: 5 },
  ]

  for (const patch of landPatches) {
    const topLeft = latLonToPixel(patch.lat + patch.sizeLat / 2, patch.lon - patch.sizeLon / 2)
    const bottomRight = latLonToPixel(patch.lat - patch.sizeLat / 2, patch.lon + patch.sizeLon / 2)

    ctx.beginPath()
    ctx.roundRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y, 8)
    ctx.fill()
    ctx.stroke()
  }
}

function drawTrack() {
  if (!ctx) return

  const start = latLonToPixel(navStartPosition.value.latitude, navStartPosition.value.longitude)
  const dr = latLonToPixel(drPosition.value.latitude, drPosition.value.longitude)

  ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 4])

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(dr.x, dr.y)
  ctx.stroke()

  ctx.setLineDash([])

  drawPositionMarker(start.x, start.y, '#4CAF50', '起点')

  drawPositionMarker(dr.x, dr.y, '#FF9800', 'DR')

  drawHeadingArrow(dr.x, dr.y)
}

function drawHeadingArrow(x: number, y: number) {
  if (!ctx) return

  const headingRad = (navShipHeading.value * Math.PI) / 180
  const arrowLength = 30

  const endX = x + Math.sin(headingRad) * arrowLength
  const endY = y - Math.cos(headingRad) * arrowLength

  ctx.strokeStyle = 'rgba(255, 152, 0, 0.8)'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  const headLength = 8
  const headAngle = Math.PI / 6

  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLength * Math.sin(headingRad - headAngle),
    endY + headLength * Math.cos(headingRad - headAngle)
  )
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLength * Math.sin(headingRad + headAngle),
    endY + headLength * Math.cos(headingRad + headAngle)
  )
  ctx.stroke()
}

function drawPositionMarker(x: number, y: number, color: string, label: string) {
  if (!ctx) return

  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = 'white'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, x, y - 12)
}

function drawFixResult() {
  if (!ctx || !navFixResult.value) return

  const fix = navFixResult.value
  const fixPos = latLonToPixel(fix.position.latitude, fix.position.longitude)

  if (fix.errorTriangle) {
    const a = latLonToPixel(fix.errorTriangle.a.latitude, fix.errorTriangle.a.longitude)
    const b = latLonToPixel(fix.errorTriangle.b.latitude, fix.errorTriangle.b.longitude)
    const c = latLonToPixel(fix.errorTriangle.c.latitude, fix.errorTriangle.c.longitude)

    ctx.fillStyle = 'rgba(255, 100, 100, 0.2)'
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(c.x, c.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  const kmPerDegreeLat = 111
  const radiusPx = (fix.errorRadius * kmPerDegreeLat) / scale.value

  ctx.beginPath()
  ctx.arc(fixPos.x, fixPos.y, Math.max(15, radiusPx), 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(33, 150, 243, 0.15)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(33, 150, 243, 0.6)'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.stroke()
  ctx.setLineDash([])

  drawPositionMarker(fixPos.x, fixPos.y, '#2196F3', '定位')

  drawLOPLines(fixPos)
}

function drawLOPLines(fixPos: { x: number; y: number }) {
  if (!ctx || !navFixResult.value) return

  const lops = navFixResult.value.linesOfPosition
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3']

  for (let i = 0; i < lops.length; i++) {
    const lop = lops[i]
    const color = colors[i % colors.length]

    const azRad = (lop.azimuth * Math.PI) / 180
    const perpRad = azRad + Math.PI / 2

    const lineLength = 150
    const startX = fixPos.x - Math.cos(perpRad) * lineLength
    const startY = fixPos.y + Math.sin(perpRad) * lineLength
    const endX = fixPos.x + Math.cos(perpRad) * lineLength
    const endY = fixPos.y - Math.sin(perpRad) * lineLength

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    const labelX = endX + Math.sin(azRad) * 10
    const labelY = endY + Math.cos(azRad) * 10

    ctx.fillStyle = color
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(lop.bodyName, labelX, labelY)
  }
}

function drawTruePosition() {
  if (!ctx || !navIsComplete.value) return

  const truePos = latLonToPixel(navTruePosition.value.latitude, navTruePosition.value.longitude)

  ctx.beginPath()
  ctx.moveTo(truePos.x - 10, truePos.y - 10)
  ctx.lineTo(truePos.x + 10, truePos.y + 10)
  ctx.moveTo(truePos.x + 10, truePos.y - 10)
  ctx.lineTo(truePos.x - 10, truePos.y + 10)
  ctx.strokeStyle = '#E91E63'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.fillStyle = '#E91E63'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('真实', truePos.x, truePos.y - 15)
}

function drawObservations() {
  if (!ctx) return

  const colors: Record<string, string> = {
    sun: '#FFD700',
    polaris: '#FFF8DC',
    sirius: '#ADD8E6',
    vega: '#E6E6FA',
  }

  for (let i = 0; i < navObservations.value.length; i++) {
    const obs = navObservations.value[i]
    const pos = latLonToPixel(drPosition.value.latitude, drPosition.value.longitude)

    const azRad = (obs.azimuth * Math.PI) / 180
    const lineLen = 80
    const endX = pos.x + Math.sin(azRad) * lineLen
    const endY = pos.y - Math.cos(azRad) * lineLen

    const color = colors[obs.bodyId] || '#888'

    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])

    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    ctx.setLineDash([])

    ctx.beginPath()
    ctx.arc(endX, endY, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.fillStyle = 'white'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${i + 1}`, endX, endY + 3)
  }
}

function drawScaleBar() {
  if (!ctx || !canvasRef.value) return

  const width = canvasRef.value.width
  const height = canvasRef.value.height

  const barWidth = 100
  const barHeight = 8
  const barX = width - barWidth - 20
  const barY = height - 30

  const kmRepresented = barWidth * scale.value

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(barX - 5, barY - 15, barWidth + 10, 35)

  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(barX, barY + barHeight / 2)
  ctx.lineTo(barX + barWidth, barY + barHeight / 2)
  ctx.stroke()

  for (let i = 0; i <= 4; i++) {
    const x = barX + (barWidth * i) / 4
    ctx.beginPath()
    ctx.moveTo(x, barY)
    ctx.lineTo(x, barY + barHeight)
    ctx.stroke()
  }

  ctx.fillStyle = 'white'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`${kmRepresented.toFixed(0)} km`, barX + barWidth / 2, barY - 5)
}

function drawCompass() {
  if (!ctx || !canvasRef.value) return

  const compassX = 50
  const compassY = 50
  const compassR = 25

  ctx.beginPath()
  ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#FF6B6B'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', compassX, compassY - compassR + 10)

  ctx.fillStyle = 'white'
  ctx.font = '10px sans-serif'
  ctx.fillText('E', compassX + compassR - 8, compassY)
  ctx.fillText('W', compassX - compassR + 8, compassY)
  ctx.fillText('S', compassX, compassY + compassR - 10)
}

function drawChart() {
  if (!ctx) return

  ctx.clearRect(0, 0, canvasRef.value?.width || 0, canvasRef.value?.height || 0)

  drawGrid()
  drawLandmass()
  drawObservations()
  drawTrack()
  drawFixResult()
  drawTruePosition()
  drawScaleBar()
  drawCompass()
}

function onMouseDown(event: MouseEvent) {
  isDragging = true
  lastMousePos = { x: event.clientX, y: event.clientY }
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging) return

  const dx = event.clientX - lastMousePos.x
  const dy = event.clientY - lastMousePos.y

  const kmPerDegreeLat = 111
  const kmPerDegreeLon = 111 * Math.cos((centerLat.value * Math.PI) / 180)

  const dLat = -(dy * scale.value) / kmPerDegreeLat
  const dLon = (dx * scale.value) / kmPerDegreeLon

  centerLat.value += dLat
  centerLon.value += dLon

  lastMousePos = { x: event.clientX, y: event.clientY }

  drawChart()
}

function onMouseUp() {
  isDragging = false
}

function onWheel(event: WheelEvent) {
  event.preventDefault()

  const zoomFactor = event.deltaY > 0 ? 1.2 : 0.8
  scale.value = Math.max(0.5, Math.min(200, scale.value * zoomFactor))

  drawChart()
}

function onResize() {
  initCanvas()
}

watch(
  [
    navStartPosition,
    drPosition,
    navFixResult,
    navTruePosition,
    navObservations,
    navIsComplete,
    navShipHeading,
  ],
  () => {
    drawChart()
  },
  { deep: true }
)

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', onResize)

  if (drPosition.value) {
    centerLat.value = drPosition.value.latitude
    centerLon.value = drPosition.value.longitude
    drawChart()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.sea-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #0a1628;
  border-radius: 8px;
  cursor: grab;
}

.sea-chart-container:active {
  cursor: grabbing;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.chart-legend {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.6);
  padding: 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 12px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.legend-dot.start {
  background: #4CAF50;
}

.legend-dot.dr {
  background: #FF9800;
}

.legend-dot.fix {
  background: #2196F3;
}

.legend-dot.true {
  background: #E91E63;
  border-radius: 0;
  transform: rotate(45deg);
}

.chart-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.6);
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  display: flex;
  gap: 8px;
  color: white;
  font-size: 11px;
  font-family: monospace;
}

.info-item .label {
  color: #888;
}

.info-item .value {
  color: #ffd700;
}
</style>
