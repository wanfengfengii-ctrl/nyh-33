<template>
  <div ref="containerRef" class="astrolabe-container" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onMouseUp">
    <canvas ref="canvasRef"></canvas>
    <div class="angle-indicator">
      <span>照准尺角度: {{ alidadeAngle.toFixed(1) }}°</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { useAstrolabeStore } from '../stores/astrolabe'
import { storeToRefs } from 'pinia'
import { toRadians } from '../utils/astronomy'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const store = useAstrolabeStore()
const { alidadeAngle, bodyPosition, selectedBody, isBodyVisible, latitude } = storeToRefs(store)
const { setAlidadeAngle } = store

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let astrolabeGroup: THREE.Group
let alidadeGroup: THREE.Group
let celestialMarker: THREE.Mesh
let animationId: number
let isDragging = false
let isRotatingView = false
let previousMouse = { x: 0, y: 0 }
let targetRotationX = 0.5
let targetRotationY = 0
let currentRotationX = 0.5
let currentRotationY = 0

function initScene() {
  if (!containerRef.value || !canvasRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.z = 5

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  astrolabeGroup = new THREE.Group()
  scene.add(astrolabeGroup)

  createAstrolabe()
  createAlidade()
  createCelestialMarker()
  createStars()

  animate()
}

function createAstrolabe() {
  const ringGeometry = new THREE.TorusGeometry(2, 0.08, 16, 100)
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8860b,
    metalness: 0.8,
    roughness: 0.3,
  })

  const outerRing = new THREE.Mesh(ringGeometry, ringMaterial)
  astrolabeGroup.add(outerRing)

  const innerRingGeometry = new THREE.TorusGeometry(1.5, 0.05, 16, 100)
  const innerRing = new THREE.Mesh(innerRingGeometry, ringMaterial)
  astrolabeGroup.add(innerRing)

  const centerGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32)
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.9,
    roughness: 0.2,
  })
  const center = new THREE.Mesh(centerGeometry, centerMaterial)
  center.rotation.x = Math.PI / 2
  astrolabeGroup.add(center)

  for (let i = 0; i < 360; i += 10) {
    const angle = toRadians(i)
    const isMajor = i % 30 === 0
    const tickLength = isMajor ? 0.15 : 0.08
    const tickWidth = isMajor ? 0.02 : 0.01

    const tickGeometry = new THREE.BoxGeometry(tickWidth, tickLength, 0.02)
    const tickMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
    })
    const tick = new THREE.Mesh(tickGeometry, tickMaterial)
    tick.position.x = Math.cos(angle) * (2 - 0.12)
    tick.position.y = Math.sin(angle) * (2 - 0.12)
    tick.rotation.z = angle + Math.PI / 2
    astrolabeGroup.add(tick)
  }

  for (let i = 0; i < 9; i++) {
    const angle = toRadians(i * 10 - 80)
    if (Math.abs(i * 10 - 90) < 5) continue

    const altitudeRingGeometry = new THREE.RingGeometry(1.9 - i * 0.2, 1.9 - i * 0.2 + 0.01, 64)
    const altitudeMaterial = new THREE.MeshBasicMaterial({
      color: 0xdaa520,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const altitudeRing = new THREE.Mesh(altitudeRingGeometry, altitudeMaterial)
    altitudeRing.rotation.x = Math.PI / 2
    altitudeRing.position.y = Math.sin(angle) * 1.5
    astrolabeGroup.add(altitudeRing)
  }

  const horizonGeometry = new THREE.RingGeometry(1.95, 2, 64)
  const horizonMaterial = new THREE.MeshBasicMaterial({
    color: 0x4169e1,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  })
  const horizonRing = new THREE.Mesh(horizonGeometry, horizonMaterial)
  horizonRing.rotation.x = Math.PI / 2
  astrolabeGroup.add(horizonRing)

  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 256
  labelCanvas.height = 128
  const labelCtx = labelCanvas.getContext('2d')
  if (labelCtx) {
    labelCtx.fillStyle = '#ffd700'
    labelCtx.font = 'bold 24px serif'
    labelCtx.textAlign = 'center'
    labelCtx.fillText('N', 64, 40)
    labelCtx.fillText('S', 64, 110)
    labelCtx.fillText('E', 10, 75)
    labelCtx.fillText('W', 118, 75)
  }

  const labelTexture = new THREE.CanvasTexture(labelCanvas)
  const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true })
  const labelSprite = new THREE.Sprite(labelMaterial)
  labelSprite.position.set(0, 0, -0.1)
  labelSprite.scale.set(2.5, 1.25, 1)
  astrolabeGroup.add(labelSprite)
}

function createAlidade() {
  alidadeGroup = new THREE.Group()
  astrolabeGroup.add(alidadeGroup)

  const alidadeGeometry = new THREE.BoxGeometry(0.06, 2.2, 0.04)
  const alidadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    metalness: 0.3,
    roughness: 0.5,
  })
  const alidadeBar = new THREE.Mesh(alidadeGeometry, alidadeMaterial)
  alidadeBar.position.y = 1.1
  alidadeGroup.add(alidadeBar)

  const sightGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16)
  const sightMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f4f4f,
    metalness: 0.7,
    roughness: 0.3,
  })
  const topSight = new THREE.Mesh(sightGeometry, sightMaterial)
  topSight.position.set(0, 2.1, 0)
  topSight.rotation.x = Math.PI / 2
  alidadeGroup.add(topSight)

  const bottomSight = new THREE.Mesh(sightGeometry, sightMaterial)
  bottomSight.position.set(0, 0, 0)
  bottomSight.rotation.x = Math.PI / 2
  alidadeGroup.add(bottomSight)

  const pointerGeometry = new THREE.ConeGeometry(0.06, 0.12, 8)
  const pointerMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.5,
    roughness: 0.5,
    emissive: 0xff0000,
    emissiveIntensity: 0.3,
  })
  const pointer = new THREE.Mesh(pointerGeometry, pointerMaterial)
  pointer.position.set(0, 2.25, 0)
  pointer.rotation.z = Math.PI
  alidadeGroup.add(pointer)

  alidadeGroup.rotation.z = toRadians(-alidadeAngle.value)
}

function createCelestialMarker() {
  const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16)
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: selectedBody.value.color,
    transparent: true,
    opacity: isBodyVisible.value ? 1 : 0.3,
  })
  celestialMarker = new THREE.Mesh(markerGeometry, markerMaterial)
  astrolabeGroup.add(celestialMarker)

  const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: selectedBody.value.color,
    transparent: true,
    opacity: 0.3,
  })
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  celestialMarker.add(glow)

  updateCelestialMarker()
}

function updateCelestialMarker() {
  if (!celestialMarker) return

  const alt = bodyPosition.value.altitude
  const az = bodyPosition.value.azimuth

  const altRad = toRadians(alt)
  const azRad = toRadians(az)

  const maxRadius = 1.8
  const radius = maxRadius * Math.cos(altRad)
  const height = maxRadius * Math.sin(altRad)

  const x = radius * Math.sin(azRad)
  const y = height
  const z = -radius * Math.cos(azRad)

  celestialMarker.position.set(x, y, z)

  const material = celestialMarker.material as THREE.MeshBasicMaterial
  material.opacity = isBodyVisible.value ? 1 : 0.3
  material.color.set(selectedBody.value.color)
}

function createStars() {
  const starsGeometry = new THREE.BufferGeometry()
  const starCount = 500
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    const radius = 8 + Math.random() * 2
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)

    const brightness = 0.5 + Math.random() * 0.5
    colors[i * 3] = brightness
    colors[i * 3 + 1] = brightness
    colors[i * 3 + 2] = brightness * 0.9
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const starsMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  })

  const stars = new THREE.Points(starsGeometry, starsMaterial)
  scene.add(stars)
}

function updateAlidade() {
  if (alidadeGroup) {
    alidadeGroup.rotation.z = toRadians(-alidadeAngle.value)
  }
}

function onMouseDown(event: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)

  if (distance < rect.width * 0.35) {
    isDragging = true
  } else {
    isRotatingView = true
  }

  previousMouse = { x: event.clientX, y: event.clientY }
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging && !isRotatingView) return

  const deltaX = event.clientX - previousMouse.x
  const deltaY = event.clientY - previousMouse.y

  if (isDragging && isBodyVisible.value) {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = event.clientX - rect.left - centerX
    const y = event.clientY - rect.top - centerY

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360

    let alidade = 90 - angle
    if (alidade < 0) alidade += 360
    if (alidade > 180) alidade = 360 - alidade

    setAlidadeAngle(alidade)
  }

  if (isRotatingView) {
    targetRotationY += deltaX * 0.01
    targetRotationX += deltaY * 0.01
    targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX))
  }

  previousMouse = { x: event.clientX, y: event.clientY }
}

function onMouseUp() {
  isDragging = false
  isRotatingView = false
}

function onTouchStart(event: TouchEvent) {
  event.preventDefault()
  const touch = event.touches[0]
  const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent
  onMouseDown(mouseEvent)
}

function onTouchMove(event: TouchEvent) {
  event.preventDefault()
  const touch = event.touches[0]
  const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent
  onMouseMove(mouseEvent)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  currentRotationX += (targetRotationX - currentRotationX) * 0.05
  currentRotationY += (targetRotationY - currentRotationY) * 0.05

  if (astrolabeGroup) {
    astrolabeGroup.rotation.x = currentRotationX
    astrolabeGroup.rotation.y = currentRotationY
  }

  updateAlidade()
  updateCelestialMarker()

  renderer.render(scene, camera)
}

function onResize() {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
}

watch(alidadeAngle, () => {
  updateAlidade()
})

watch([bodyPosition, selectedBody, isBodyVisible, latitude], () => {
  updateCelestialMarker()
})

onMounted(() => {
  initScene()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.astrolabe-container {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: grab;
  user-select: none;
}

.astrolabe-container:active {
  cursor: grabbing;
}

.angle-indicator {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  z-index: 10;
}
</style>
