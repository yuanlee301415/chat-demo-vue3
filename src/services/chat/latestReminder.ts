import { t } from '../../i18n'
import { formatDate } from '../../utils/format'

/**
 * 模型约定的五项信息：日期、星期、地区、平台、语言。
 * 地区当前恒为空串（本应用不做定位），日期与星期使用浏览器本地时区，避免 UTC 跨日。
 */
export const createLatestReminder = (now = new Date()): string => [formatDate(now) ?? '', new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now), '', 'Web', t('latestReminderLanguage')].join(',')
