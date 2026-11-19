import type { TranslationMessage } from '../../i18n'
import type { ApiErrorKind, ChatModel, MessageUsage, ServerToolBlock, StopDetails, StopReason, TextCitation } from '../api/types'

/**
 * 消息附件。id 是本地标识（IndexedDB files 表的主键，原件按它存储，所有引用同一 id 的消息共用一份），
 * 导入的附件沿用导出产物里的文件 ID；本地没有原件的附件只展示文件名，不进入请求。
 * serverId 是 Files API 返回的 file_id，导入的数据或尚未上传成功的文件为 null，发送前补传。
 */
export type FileAttachment = {
  /** 本地附件 id，同时是 IndexedDB files 表主键 */
  id: string
  /** Files API 的 file_id；未上传或导入数据为 null */
  serverId: string | null
  /** 原始文件名 */
  name: string
  /** 文件字节数 */
  size: number
  /** 附件类别；导入时沿用归档的 is_image，不由 MIME 识别结果决定。 */
  isImage: boolean
  /** 具体 MIME；导入时没有原件或无法识别的为空字符串，不影响图片身份。 */
  mimeType: string
}

/** 本地消息的分支关系；字段缺省时按线性消息列表处理。 */
type MessageBranch = {
  /** 分支父节点；线性消息为 null 或缺省 */
  parentId?: string | null
  /** 当前选中的下一条消息；切换版本时保留每条分支原有的选择。 */
  selectedChildId?: string
}

export type UserMessage = MessageBranch & {
  /** 消息 id */
  id: string
  /** 固定为 user */
  role: 'user'
  /** 用户输入正文 */
  content: string
  /** 本轮附件 */
  files: FileAttachment[]
  /** 创建时间（毫秒） */
  createdAt: number
}

/** 思考块：thinking_delta 累积，签名随 signature_delta 到达；历史轮次的思考服务端会丢弃，不回传 */
export type ThinkingPart = {
  /** 块类型 */
  type: 'thinking'
  /** 思考正文 */
  thinking: string
  /** 思考签名，回传历史时必需 */
  signature?: string
  /** content_block_start 的时间；没有事件时间的历史块缺省 */
  startedAt?: number
  /** content_block_stop（或回复结束）的时间 */
  endedAt?: number
  /** 仅有耗时、没有事件时间时保存秒数。 */
  elapsedSeconds?: number
}

/** 文本块：text_delta 累积，citations_delta 追加引用 */
export type TextPart = {
  /** 块类型 */
  type: 'text'
  /** 正文 */
  text: string
  /** 正文引用 */
  citations?: TextCitation[]
  /** 服务端提示文案，仅用于展示，不作为模型回答参与上下文或续写。 */
  isTemplate?: boolean
}

/** 服务端工具调用与结果块按协议原样保存；历史请求只回传 read_link 调用与结果 */
export type ReplyBlock = ThinkingPart | TextPart | ServerToolBlock

/**
 * pending：已发出请求，还没收到事件；streaming：正在接收；
 * done：收到 message_stop；stopped：用户停止或页面关闭；error：请求或流出错
 */
export type ReplyStatus = 'pending' | 'streaming' | 'done' | 'stopped' | 'error'

export type AssistantMessage = MessageBranch & {
  /** 消息 id */
  id: string
  /** 固定为 assistant */
  role: 'assistant'
  /** 创建时间（毫秒） */
  createdAt: number
  /** 未记录模型时为 null，续写使用当前默认模型。 */
  model: ChatModel | null
  /** 请求时是否开启深度思考 */
  thinking?: boolean
  /** 请求时是否声明 deepseek_web_search；关闭时仍声明 deepseek_read_url */
  search?: boolean
  /** 本轮请求的系统信息快照；各回答版本独立保存，续写沿用。历史消息中缺省的快照保持为空。 */
  latestReminder?: string
  /** 是否允许作为续写前缀；仍需满足回复状态与内容限制。 */
  prefix: boolean
  /** 回复状态 */
  status: ReplyStatus
  /** 可识别的内容块按接收顺序排列；续写产生的块追加在已有块之后 */
  blocks: ReplyBlock[]
  /** 结束原因 */
  stopReason?: StopReason
  /** 拒绝详情 */
  stopDetails?: StopDetails
  /** 最近一次请求的用量，续写后更新 */
  usage?: MessageUsage
  /** 最近一次失败信息 */
  error?: {
    /** upload：发送前补传附件失败，请求没有发出 */
    kind: ApiErrorKind | 'upload'
    /** 原始错误文案 */
    message: string
    /** HTTP 状态码（没有则为 undefined） */
    status?: number
    /** 可本地化的文案，历史数据可能缺失 */
    localMessage?: TranslationMessage
    /** 仅 upload：重新上传是否可能成功（网络、限流、服务端繁忙）；过大、格式不支持为 false */
    retryable?: boolean
  }
}

export type Message = UserMessage | AssistantMessage

export type Session = {
  /** 会话 id */
  id: string
  /** 会话标题 */
  title: string
  /** 创建时间（毫秒） */
  createdAt: number
  /** 最后更新时间（毫秒），用于列表排序 */
  updatedAt: number
  /** 包含所有分支的消息，按创建顺序存储。 */
  messages: Message[]
  /** undefined 表示线性消息列表；null 表示空会话。 */
  rootMessageId?: string | null
}

/** 会话列表元数据；消息只在打开会话时加载。 */
export type SessionSummary = Pick<Session, 'id' | 'title' | 'createdAt' | 'updatedAt'>

/** 显式提取字段，避免将完整会话的消息带进列表。 */
export const toSessionSummary = (session: SessionSummary): SessionSummary => ({
  id: session.id,
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
})
