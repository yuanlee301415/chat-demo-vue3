import { t } from '../../i18n'
import { monthKey } from '../../utils/format'
import type { SessionSummary } from './types'

const DAY = 86_400_000

/** 时间段分组：今天 / 昨天 / 7 天内 / 30 天内 / 更早按月份。 */
export type SessionGroup = {
  /** 分组标识：文案键或 `YYYY-MM` */
  key: string
  /** 展示文案（已本地化） */
  label: string
  /** 该分组下的会话，保持传入顺序 */
  sessions: SessionSummary[]
}

/** 当天零点的时间戳。 */
const startOfDay = (time: number): number => new Date(time).setHours(0, 0, 0, 0)

/**
 * 按更新时间把会话摘要分组；入参需已按 `updatedAt` 降序排列。
 * 同一分组的会话相邻，因此只比较相邻项即可。
 */
export const groupSessions = (sessions: SessionSummary[], now: number): SessionGroup[] => {
  const groups: SessionGroup[] = []
  for (const session of sessions) {
    const diff = Math.floor((now - startOfDay(session.updatedAt)) / DAY)
    const key = diff <= 0 ? 'sessionHistoryTimelineLabelToday' : diff <= 1 ? 'sessionHistoryTimelineLabelYesterday' : diff < 7 ? 'sessionHistoryTimelineLabel7days' : diff < 30 ? 'sessionHistoryTimelineLabel30days' : null
    const groupKey = key ?? monthKey(session.updatedAt) ?? ''
    const last = groups.at(-1)
    if (last?.key === groupKey) {
      last.sessions.push(session)
    } else {
      groups.push({ key: groupKey, label: key ? t(key) : groupKey, sessions: [session] })
    }
  }
  return groups
}
