import { cityNames, provinceNames, regionCodes, regionNameOverrides } from './locationData'

export { regionCodes }

/** 省份与其下辖城市；code 为行政区划代码。 */
export type Province = {
  /** 省级行政区划代码（6 位） */
  code: string
  /** 省 / 直辖市 / 自治区名称 */
  name: string
  /** 下辖城市 */
  cities: Array<{
    /** 城市行政区划代码（6 位） */
    code: string
    /** 城市名称 */
    name: string
  }>
}

/** 用户选择的位置；省、市只对在中国大陆时有意义。 */
export type UserLocation = {
  /** ISO 3166-1 两位国家/地区代码 */
  region: string
  /** 省级行政区划代码；仅 `region` 为 CN 时存在 */
  province?: string
  /** 城市行政区划代码；选择到城市时才有 */
  city?: string
}

/** 省份与城市按行政区划代码前缀归属（城市代码前两位与省相同）。 */
export const provinces: Province[] = Object.entries(provinceNames).map(([code, name]) => ({
  code,
  name,
  cities: Object.entries(cityNames)
    .filter(([cityCode]) => cityCode.startsWith(code.slice(0, 2)))
    .map(([cityCode, cityName]) => ({ code: cityCode, name: cityName })),
}))

const regions = new Set(regionCodes)

const regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })

/** 国家/地区代码 → 中文名称；不是合法代码时返回空串。 */
export const getRegionName = (code: string): string => (regions.has(code) ? (regionNameOverrides[code] ?? regionNames.of(code) ?? code) : '')

/** 浏览器语言是否偏向中文：决定位置按省市选还是按国家/地区选。 */
export const isChineseBrowser = (): boolean => (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

/**
 * 校验持久化的位置数据：未知地区、省/市与地区不匹配都视为非法。
 */
export const normalizeLocation = (value: unknown): UserLocation | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const location = value as Record<string, unknown>
  const { region, province, city } = location
  if (typeof region !== 'string' || !regions.has(region)) {
    return null
  }
  if (region !== 'CN') {
    return { region }
  }
  if (province === undefined) {
    return city === undefined ? { region } : null
  }
  const selectedProvince = provinces.find((item) => item.code === province)
  if (!selectedProvince) {
    return null
  }
  if (city === undefined) {
    return { region, province: selectedProvince.code }
  }
  const selectedCity = selectedProvince.cities.find((item) => item.code === city)
  return selectedCity ? { region, province: selectedProvince.code, city: selectedCity.code } : null
}
