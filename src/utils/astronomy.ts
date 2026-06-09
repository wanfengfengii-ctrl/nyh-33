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
