export interface CelestialBody {
  id: string
  name: string
  ra: number
  dec: number
  magnitude: number
  color: string
}

export const CELESTIAL_BODIES: CelestialBody[] = [
  { id: 'polaris', name: '北极星', ra: 2.5302, dec: 89.2641, magnitude: 1.98, color: '#FFF8DC' },
  { id: 'sun', name: '太阳', ra: 0, dec: 0, magnitude: -26.74, color: '#FFD700' },
  { id: 'sirius', name: '天狼星', ra: 6.7525, dec: -16.7273, magnitude: -1.46, color: '#ADD8E6' },
  { id: 'vega', name: '织女星', ra: 18.6156, dec: 38.7837, magnitude: 0.03, color: '#E6E6FA' },
  { id: 'arcturus', name: '大角星', ra: 14.2576, dec: 19.1824, magnitude: -0.05, color: '#FFA500' },
  { id: 'capella', name: '五车二', ra: 5.2782, dec: 45.9980, magnitude: 0.08, color: '#FFFACD' },
  { id: 'rigel', name: '参宿七', ra: 5.2423, dec: -8.2016, magnitude: 0.13, color: '#ADD8E6' },
  { id: 'procyon', name: '南河三', ra: 7.6552, dec: 5.2250, magnitude: 0.34, color: '#FFFACD' },
  { id: 'betelgeuse', name: '参宿四', ra: 5.9194, dec: 7.4071, magnitude: 0.42, color: '#FF4500' },
  { id: 'antares', name: '心宿二', ra: 16.4901, dec: -26.4316, magnitude: 0.96, color: '#FF4500' },
  { id: 'spica', name: '角宿一', ra: 13.4194, dec: -11.1614, magnitude: 0.97, color: '#ADD8E6' },
  { id: 'altair', name: '牛郎星', ra: 19.8464, dec: 8.8683, magnitude: 0.77, color: '#FFFACD' },
]

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

export function getJulianDate(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  const minute = date.getUTCMinutes()
  const second = date.getUTCSeconds()

  let Y = year
  let M = month
  if (M <= 2) {
    Y -= 1
    M += 12
  }

  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)

  const JD =
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    day +
    B -
    1524.5 +
    (hour + minute / 60 + second / 3600) / 24

  return JD
}

export function getGMST(date: Date): number {
  const JD = getJulianDate(date)
  const T = (JD - 2451545.0) / 36525.0

  let GMST =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.0003032 * T * T -
    (T * T * T) / 38710000

  GMST = GMST % 360
  if (GMST < 0) GMST += 360

  return GMST
}

export function getSunPosition(date: Date): { ra: number; dec: number } {
  const JD = getJulianDate(date)
  const n = JD - 2451545.0

  const L = 280.46 + 0.9856474 * n
  const g = 357.528 + 0.9856003 * n
  const gRad = toRadians(g % 360)

  let lambda = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad)
  lambda = lambda % 360

  const epsilon = 23.439 - 0.0000004 * n
  const epsilonRad = toRadians(epsilon)
  const lambdaRad = toRadians(lambda)

  const alphaRad = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad))
  let alpha = toDegrees(alphaRad) / 15
  if (alpha < 0) alpha += 24

  const deltaRad = Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad))
  const delta = toDegrees(deltaRad)

  return { ra: alpha, dec: delta }
}

export function getLocalSiderealTime(date: Date, longitude: number): number {
  const GMST = getGMST(date)
  let LST = GMST + longitude
  LST = LST % 360
  if (LST < 0) LST += 360
  return LST
}

export function getHourAngle(date: Date, ra: number, longitude: number): number {
  const LST = getLocalSiderealTime(date, longitude)
  const raDegrees = ra * 15
  let HA = LST - raDegrees
  if (HA < 0) HA += 360
  if (HA > 180) HA -= 360
  return HA
}

export function getAltitude(
  date: Date,
  ra: number,
  dec: number,
  latitude: number,
  longitude: number
): number {
  const HA = getHourAngle(date, ra, longitude)
  const latRad = toRadians(latitude)
  const decRad = toRadians(dec)
  const HARad = toRadians(HA)

  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(HARad)

  const altitude = toDegrees(Math.asin(sinAlt))
  return altitude
}

export function getAzimuth(
  date: Date,
  ra: number,
  dec: number,
  latitude: number,
  longitude: number
): number {
  const HA = getHourAngle(date, ra, longitude)
  const latRad = toRadians(latitude)
  const decRad = toRadians(dec)
  const HARad = toRadians(HA)

  const altitude = getAltitude(date, ra, dec, latitude, longitude)
  const altRad = toRadians(altitude)

  const cosA =
    (Math.sin(decRad) - Math.sin(latRad) * Math.sin(altRad)) /
    (Math.cos(latRad) * Math.cos(altRad))

  let A = toDegrees(Math.acos(Math.max(-1, Math.min(1, cosA))))

  if (Math.sin(HARad) > 0) {
    A = 360 - A
  }

  return A
}

export function getCelestialBodyPosition(
  body: CelestialBody,
  date: Date,
  latitude: number,
  longitude: number
): { altitude: number; azimuth: number } {
  let ra = body.ra
  let dec = body.dec

  if (body.id === 'sun') {
    const sunPos = getSunPosition(date)
    ra = sunPos.ra
    dec = sunPos.dec
  }

  const altitude = getAltitude(date, ra, dec, latitude, longitude)
  const azimuth = getAzimuth(date, ra, dec, latitude, longitude)

  return { altitude, azimuth }
}

export function calculateScore(error: number): number {
  const absError = Math.abs(error)
  if (absError <= 0.5) return 100
  if (absError <= 1) return 95
  if (absError <= 2) return 85
  if (absError <= 3) return 75
  if (absError <= 5) return 60
  if (absError <= 10) return 40
  return Math.max(0, 20 - absError)
}

export function getScoreGrade(score: number): string {
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 70) return '中等'
  if (score >= 60) return '及格'
  return '不及格'
}

export interface Observation {
  bodyId: string
  bodyName: string
  measuredAltitude: number
  trueAltitude: number
  observationTime: Date
  azimuth: number
}

export interface Position {
  latitude: number
  longitude: number
}

export interface LineOfPosition {
  bodyId: string
  bodyName: string
  intercept: number
  azimuth: number
  assumedPosition: Position
}

export interface FixResult {
  position: Position
  errorTriangle?: {
    a: Position
    b: Position
    c: Position
    area: number
  }
  errorRadius: number
  linesOfPosition: LineOfPosition[]
  confidence: number
}

export function getGHA(body: CelestialBody, date: Date): number {
  let ra = body.ra
  if (body.id === 'sun') {
    const sunPos = getSunPosition(date)
    ra = sunPos.ra
  }
  const GHA = getGMST(date) - ra * 15
  let gha = GHA % 360
  if (gha < 0) gha += 360
  return gha
}

export function getDeclination(body: CelestialBody, date: Date): number {
  if (body.id === 'sun') {
    const sunPos = getSunPosition(date)
    return sunPos.dec
  }
  return body.dec
}

export function calculateAltitude(
  lat: number,
  lon: number,
  dec: number,
  gha: number
): number {
  const latRad = toRadians(lat)
  const decRad = toRadians(dec)
  const lhaRad = toRadians(gha + lon)

  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(lhaRad)

  return toDegrees(Math.asin(Math.max(-1, Math.min(1, sinAlt))))
}

export function calculateAzimuth(
  lat: number,
  lon: number,
  dec: number,
  gha: number
): number {
  const latRad = toRadians(lat)
  const decRad = toRadians(dec)
  const lhaRad = toRadians(gha + lon)

  const altitude = calculateAltitude(lat, lon, dec, gha)
  const altRad = toRadians(altitude)

  const cosZ =
    (Math.sin(decRad) - Math.sin(latRad) * Math.sin(altRad)) /
    (Math.cos(latRad) * Math.cos(altRad))

  let Z = toDegrees(Math.acos(Math.max(-1, Math.min(1, cosZ))))

  if (Math.sin(lhaRad) > 0) {
    Z = 360 - Z
  }

  return Z
}

export function calculateIntercept(
  assumedPosition: Position,
  body: CelestialBody,
  observedAltitude: number,
  date: Date
): LineOfPosition {
  const dec = getDeclination(body, date)
  const gha = getGHA(body, date)
  const calculatedAltitude = calculateAltitude(
    assumedPosition.latitude,
    assumedPosition.longitude,
    dec,
    gha
  )
  const azimuth = calculateAzimuth(
    assumedPosition.latitude,
    assumedPosition.longitude,
    dec,
    gha
  )

  const intercept = observedAltitude - calculatedAltitude

  return {
    bodyId: body.id,
    bodyName: body.name,
    intercept,
    azimuth,
    assumedPosition: { ...assumedPosition },
  }
}

export function haversineDistance(pos1: Position, pos2: Position): number {
  const R = 6371
  const dLat = toRadians(pos2.latitude - pos1.latitude)
  const dLon = toRadians(pos2.longitude - pos1.longitude)
  const lat1 = toRadians(pos1.latitude)
  const lat2 = toRadians(pos2.latitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function findLOPIntersection(
  lop1: LineOfPosition,
  lop2: LineOfPosition
): Position | null {
  const ap = lop1.assumedPosition
  const nmPerDegreeLat = 60
  const nmPerDegreeLon = 60 * Math.cos(toRadians(ap.latitude))

  const intercept1Nm = lop1.intercept * 60
  const intercept2Nm = lop2.intercept * 60

  const az1Rad = toRadians(lop1.azimuth)
  const az2Rad = toRadians(lop2.azimuth)

  const p1 = {
    x: intercept1Nm * Math.sin(az1Rad) / nmPerDegreeLon,
    y: intercept1Nm * Math.cos(az1Rad) / nmPerDegreeLat,
  }

  const p2 = {
    x: intercept2Nm * Math.sin(az2Rad) / nmPerDegreeLon,
    y: intercept2Nm * Math.cos(az2Rad) / nmPerDegreeLat,
  }

  const perpAz1 = lop1.azimuth + 90
  const perpAz2 = lop2.azimuth + 90

  const m1 = Math.tan(toRadians(perpAz1))
  const m2 = Math.tan(toRadians(perpAz2))

  if (Math.abs(m1 - m2) < 0.001) return null

  const x = (p2.y - p1.y + m1 * p1.x - m2 * p2.x) / (m1 - m2)
  const y = p1.y + m1 * (x - p1.x)

  return {
    latitude: ap.latitude + y,
    longitude: ap.longitude + x,
  }
}

export function calculateTriangleArea(a: Position, b: Position, c: Position): number {
  const ab = haversineDistance(a, b)
  const bc = haversineDistance(b, c)
  const ca = haversineDistance(c, a)

  const s = (ab + bc + ca) / 2
  const area = Math.sqrt(s * (s - ab) * (s - bc) * (s - ca))

  return area
}

export function calculateCentroid(points: Position[]): Position {
  if (points.length === 0) return { latitude: 0, longitude: 0 }

  let latSum = 0
  let lonSum = 0

  for (const p of points) {
    latSum += p.latitude
    lonSum += p.longitude
  }

  return {
    latitude: latSum / points.length,
    longitude: lonSum / points.length,
  }
}

export function calculateFix(
  observations: Observation[],
  assumedPosition: Position
): FixResult | null {
  if (observations.length < 2) return null

  const linesOfPosition: LineOfPosition[] = []

  for (const obs of observations) {
    const body = CELESTIAL_BODIES.find((b) => b.id === obs.bodyId)
    if (!body) continue

    const lop = calculateIntercept(
      assumedPosition,
      body,
      obs.measuredAltitude,
      obs.observationTime
    )
    linesOfPosition.push(lop)
  }

  if (linesOfPosition.length < 2) return null

  const intersections: Position[] = []

  for (let i = 0; i < linesOfPosition.length; i++) {
    for (let j = i + 1; j < linesOfPosition.length; j++) {
      const intersection = findLOPIntersection(
        linesOfPosition[i],
        linesOfPosition[j]
      )
      if (intersection) {
        intersections.push(intersection)
      }
    }
  }

  if (intersections.length === 0) return null

  const fixPosition = calculateCentroid(intersections)

  let errorRadius = 0
  for (const pt of intersections) {
    const dist = haversineDistance(fixPosition, pt)
    if (dist > errorRadius) errorRadius = dist
  }

  let errorTriangle: FixResult['errorTriangle'] | undefined
  if (intersections.length >= 3) {
    const area = calculateTriangleArea(
      intersections[0],
      intersections[1],
      intersections[2]
    )
    errorTriangle = {
      a: intersections[0],
      b: intersections[1],
      c: intersections[2],
      area,
    }
  }

  const confidence = Math.max(
    0,
    Math.min(100, 100 - errorRadius * 2 - (errorTriangle?.area || 0) * 0.1)
  )

  return {
    position: fixPosition,
    errorTriangle,
    errorRadius,
    linesOfPosition,
    confidence,
  }
}

export interface WeatherConditions {
  cloudCover: number
  windSpeed: number
  seaState: number
  visibility: number
}

export function applyWeatherNoise(
  baseAltitude: number,
  weather: WeatherConditions
): number {
  const cloudFactor = weather.cloudCover / 100
  const windFactor = weather.windSpeed / 100
  const seaFactor = weather.seaState / 10

  const noiseStdDev =
    0.1 * cloudFactor + 0.3 * windFactor + 0.2 * seaFactor + 0.05

  const noise = gaussianRandom() * noiseStdDev
  return baseAltitude + noise
}

export function applyInstrumentNoise(baseAltitude: number): number {
  const instrumentError = gaussianRandom() * 0.15
  return baseAltitude + instrumentError
}

function gaussianRandom(): number {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function isNightTime(date: Date, latitude: number, longitude: number): boolean {
  const sun = CELESTIAL_BODIES.find((b) => b.id === 'sun')!
  const pos = getCelestialBodyPosition(sun, date, latitude, longitude)
  return pos.altitude < -6
}

export function isVisibleAtNight(body: CelestialBody): boolean {
  return body.id !== 'sun'
}

export function getSeason(date: Date, latitude: number): string {
  const month = date.getMonth()
  const isNorthern = latitude >= 0

  if (month >= 2 && month <= 4) return isNorthern ? '春季' : '秋季'
  if (month >= 5 && month <= 7) return isNorthern ? '夏季' : '冬季'
  if (month >= 8 && month <= 10) return isNorthern ? '秋季' : '春季'
  return isNorthern ? '冬季' : '夏季'
}

export interface DeadReckoningParams {
  startPosition: Position
  speed: number
  heading: number
  timeHours: number
  currentSpeed?: number
  currentDirection?: number
}

export function calculateDeadReckoning(params: DeadReckoningParams): Position {
  const { startPosition, speed, heading, timeHours, currentSpeed = 0, currentDirection = 0 } = params

  const distance = speed * timeHours
  const currentDistance = currentSpeed * timeHours

  const headingRad = toRadians(heading)
  const currentRad = toRadians(currentDirection)

  const latChange =
    (distance * Math.cos(headingRad) + currentDistance * Math.cos(currentRad)) / 60
  const avgLat = startPosition.latitude + latChange / 2
  const lonChange =
    ((distance * Math.sin(headingRad) + currentDistance * Math.sin(currentRad)) /
      60 /
      Math.cos(toRadians(avgLat)))

  return {
    latitude: startPosition.latitude + latChange,
    longitude: startPosition.longitude + lonChange,
  }
}

export function calculateNavScore(
  fixResult: FixResult,
  truePosition: Position
): { score: number; grade: string; distanceError: number } {
  const distanceError = haversineDistance(fixResult.position, truePosition)

  let score = 0
  if (distanceError <= 1) score = 100
  else if (distanceError <= 5) score = 95 - (distanceError - 1) * 1.25
  else if (distanceError <= 10) score = 90 - (distanceError - 5) * 1
  else if (distanceError <= 20) score = 80 - (distanceError - 10) * 1.5
  else if (distanceError <= 50) score = 65 - (distanceError - 20) * 0.5
  else if (distanceError <= 100) score = 50 - (distanceError - 50) * 0.4
  else score = Math.max(0, 30 - (distanceError - 100) * 0.1)

  score = Math.max(0, Math.min(100, Math.round(score)))

  if (fixResult.errorTriangle) {
    const areaPenalty = Math.min(10, fixResult.errorTriangle.area * 0.05)
    score = Math.max(0, score - areaPenalty)
  }

  const grade = getScoreGrade(score)

  return { score, grade, distanceError }
}

export function formatLatitude(lat: number): string {
  const direction = lat >= 0 ? 'N' : 'S'
  const absLat = Math.abs(lat)
  const degrees = Math.floor(absLat)
  const minutes = (absLat - degrees) * 60
  return `${degrees}°${minutes.toFixed(2)}'${direction}`
}

export function formatLongitude(lon: number): string {
  const direction = lon >= 0 ? 'E' : 'W'
  const absLon = Math.abs(lon)
  const degrees = Math.floor(absLon)
  const minutes = (absLon - degrees) * 60
  return `${degrees}°${minutes.toFixed(2)}'${direction}`
}
