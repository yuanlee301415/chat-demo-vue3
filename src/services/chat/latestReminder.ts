import { t } from '../../i18n'
import { formatDate } from '../../utils/format'
import { getRegionName, provinces, type UserLocation } from '../location'

/** 地区字段：中国取市 / 省名，其他国家取中文地区名。 */
const getLocationLabel = (location: UserLocation | null): string => {
  if (location === null) {
    return ''
  }
  if (location.region === 'CN') {
    const province = provinces.find((item) => item.code === location.province)
    const city = province?.cities.find((item) => item.code === location.city)
    return city?.name ?? province?.name ?? getRegionName('CN')
  }
  return getRegionName(location.region)
}

/**
 * 模型约定的五项信息：日期、星期、地区、平台、语言。
 * 日期与星期使用浏览器本地时区，避免 UTC 跨日；地区取自设置里的位置，未设置时为空串。
 */
export const createLatestReminder = (location: UserLocation | null, now = new Date()): string =>
  [formatDate(now) ?? '', new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now), getLocationLabel(location), 'Web', t('latestReminderLanguage')].join(',')
