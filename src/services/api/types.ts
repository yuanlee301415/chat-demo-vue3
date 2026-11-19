/**
 * Messages API（Anthropic 兼容格式）协议类型，只取本应用用到的部分。
 * 文档：https://api-docs.deepseek.com/zh-cn/api/create-message
 * 声明 deepseek_web_search / deepseek_read_url 或设置 safety_check.level 为 high 时进入扩展模式。
 */

export type ChatModel = 'deepseek-flash' | 'deepseek-v4-pro'

// ---------- 响应：内容块 ----------

/** 正文引用：服务端把模型的引用标记还原为来源，挂在对应文本块上 */
export type TextCitation = {
  /** 固定为 web_search_result_location */
  type: 'web_search_result_location'
  /** 来源页面地址 */
  url: string
  /** 查不到标题时为 null */
  title: string | null
  /** 当前文本块截至该引用处的全部正文（去除首尾空白） */
  cited_text: string
  /** 恒为空串 */
  encrypted_index: string
}

/** 文本块：挂过引用的块之后，后续正文另起新块；同一块内引用按 url 去重 */
export type TextBlock = {
  /** 块类型 */
  type: 'text'
  /** 正文；引用所在位置之后的文字会落到下一个块 */
  text: string
  /** 本块末尾挂的引用，按到达顺序追加 */
  citations?: TextCitation[]
}

/** 思考块：签名在块结束前经 signature_delta 下发，值为本次响应的消息 id */
export type ThinkingBlock = {
  /** 块类型 */
  type: 'thinking'
  /** 思考正文，由 thinking_delta 累积 */
  thinking: string
  /** 思考签名，回传历史时必需 */
  signature: string
}

/** 服务端识别调用所属联网能力用的 kind，区分文字搜索、图搜及边想边搜。 */
export type ServerToolKind = 'search' | 'deep_search' | 'read_link' | 'image_search' | 'deep_image_search'

/** server_tool_use 的四种动作，input 结构由 action 决定 */
export type ServerToolInput =
  | { action: 'search'; query?: string; queries: string[] }
  | { action: 'open_page'; url: string }
  /** 找不到关联页面时 url 为空串 */
  | { action: 'find_in_page'; url: string; pattern: string }
  | { action: 'read_link'; url: string }

/** 服务端工具调用块：原子下发，content_block_start 即携带完整 input */
export type ServerToolUseBlock = {
  /** 固定为 server_tool_use */
  type: 'server_tool_use'
  /** srvtoolu_{s|ds|rl|is|dis}_{序号}_{32 位 hex} */
  id: string
  /** 文字搜索与图搜均为 deepseek_web_search；read_link 为 deepseek_read_url */
  name: 'deepseek_web_search' | 'deepseek_read_url'
  /** 工具输入，结构由 action 决定 */
  input: ServerToolInput
  /** 调用来源；当前只有 direct */
  caller: { type: 'direct' }
  /** 搜索能力细分，用于展示与合并 */
  kind: ServerToolKind
}

export type WebSearchResult = {
  /** 固定为 web_search_result */
  type: 'web_search_result'
  /** 结果标题 */
  title: string
  /** 结果页面地址 */
  url: string
  /** 图搜召回的原站图片地址，可能缺省；仅保存，当前不展示图片。 */
  image_url?: string
  /** 可直接展示的网页摘要 */
  snippet: string
  /** 站点图标 URL；无法取得注册域名时为 null */
  site_icon: string | null
  /** 无站点名称时为 null */
  site_name: string | null
  /** 搜索摘要经 AES-256-GCM 加密后的 Base64，客户端无法解密展示 */
  encrypted_content: string
  /** RFC 3339 UTC 时间，没有发布时间时为 null */
  page_age: string | null
}

export type WebSearchToolResultError = {
  /** 固定为 web_search_tool_result_error */
  type: 'web_search_tool_result_error'
  /** 错误码，当前只有 unavailable */
  error_code: 'unavailable'
}

export type WebSearchToolResultBlock = {
  /** 固定为 web_search_tool_result */
  type: 'web_search_tool_result'
  /** 对应的 server_tool_use id */
  tool_use_id: string
  /** 成功且无可见结果时为 []；失败时为只含一个错误项的数组 */
  content: (WebSearchResult | WebSearchToolResultError)[]
  /** 搜索能力细分 */
  kind: 'search' | 'deep_search' | 'image_search' | 'deep_image_search'
}

export type WebFetchResult = {
  /** 固定为 web_fetch_result */
  type: 'web_fetch_result'
  /** 实际抓取的页面地址 */
  url: string
  /** 抓取到的文档 */
  content: {
    /** 文档类型，当前只有 document */
    type: 'document'
    /** read_link / deep_search 均为空串；阅读链接的页面加密在结果块的 signature 中 */
    source: { type: 'text'; media_type: 'text/plain'; data: string }
    /** 页面标题，取不到时为 null */
    title: string | null
  }
  /** read_link 为网页解析出的原始日期字符串；deep_search 为 RFC 3339 */
  published_at: string | null
}

export type WebFetchToolResultError = {
  /** 固定为 web_fetch_tool_result_error */
  type: 'web_fetch_tool_result_error'
  /** url_not_accessible 抓取失败；url_not_allowed 被拦截；unavailable 服务异常或未完成就结束 */
  error_code: 'url_not_accessible' | 'url_not_allowed' | 'unavailable'
}

export type WebFetchToolResultBlock = {
  /** 固定为 web_fetch_tool_result */
  type: 'web_fetch_tool_result'
  /** 对应的 server_tool_use id */
  tool_use_id: string
  /** 抓取结果或错误 */
  content: WebFetchResult | WebFetchToolResultError
  /** 阅读链接或边想边搜 */
  kind: 'read_link' | 'deep_search'
  /** 仅 read_link 成功时返回的加密页面，多轮请求原样回传；失败及 deep_search 不返回 */
  signature?: string
}

export type ServerToolBlock = ServerToolUseBlock | WebSearchToolResultBlock | WebFetchToolResultBlock

/** 用于识别客户端工具调用的内容块类型 */
export type ToolUseBlock = {
  /** 块类型 */
  type: 'tool_use'
  /** 客户端工具调用 id */
  id: string
  /** 工具名；本应用只用它识别，不执行客户端工具 */
  name: string
  /** 调用参数，结构由工具决定 */
  input: unknown
}

// ---------- 请求 ----------

export type TextBlockParam = {
  /** 块类型 */
  type: 'text'
  /** 要发送的正文 */
  text: string
}

/**
 * 文件块：引用经 Files API 上传的文件，图片用 image、其余用 document；
 * 图片请求需带 anthropic-beta: files-api-2025-04-14；扩展模式不支持 document，返回 400。
 */
export type FileBlockParam = {
  /** 图片用 image，其余文件用 document */
  type: 'image' | 'document'
  /** 引用 Files API 的 file_id */
  source: { type: 'file'; file_id: string }
}

/** 接口接受的调用块；历史只回传 kind 为 read_link 的调用 */
export type ServerToolUseBlockParam = Pick<ServerToolUseBlock, 'type' | 'id' | 'name' | 'input' | 'kind'>

/** 接口接受的搜索结果块；历史搜索结果不回传 */
export type WebSearchToolResultBlockParam = WebSearchToolResultBlock

/** 只回传 read_link 结果；成功时原样保留 signature，供服务端解密恢复网页上下文 */
export type WebFetchToolResultBlockParam = WebFetchToolResultBlock

export type AssistantBlockParam = TextBlockParam | ThinkingBlock | ServerToolUseBlockParam | WebSearchToolResultBlockParam | WebFetchToolResultBlockParam

/** 末尾 assistant 自动触发继续生成，无需 prefix 字段 */
export type MessageParam =
  /** Chat Engine 扩展角色，位于对应 user 前；需服务端支持 latest_reminder。 */
  { role: 'latest_reminder'; content: string } | { role: 'user'; content: string | (FileBlockParam | TextBlockParam)[] } | { role: 'assistant'; content: AssistantBlockParam[] }

/** 开启联网搜索与边想边搜 */
export type DeepseekWebSearchTool = {
  /** 固定为 deepseek_web_search */
  type: 'deepseek_web_search'
  /** 工具名，与 type 相同 */
  name: 'deepseek_web_search'
}

/** 阅读本轮用户消息中的链接，与搜索工具独立声明 */
export type DeepseekReadUrlTool = {
  /** 固定为 deepseek_read_url */
  type: 'deepseek_read_url'
  /** 工具名，与 type 相同 */
  name: 'deepseek_read_url'
}

export type CreateMessageRequest = {
  /** 模型名 */
  model: ChatModel
  /** 系统提示词 */
  system: string
  /** 按轮次排列的消息 */
  messages: MessageParam[]
  /** 是否开启深度思考 */
  thinking: { type: 'enabled' | 'disabled' }
  /** 本轮声明的服务端工具 */
  tools: (DeepseekWebSearchTool | DeepseekReadUrlTool)[]
  /** 安全审核等级，固定 high */
  safety_check: { level: 'high' }
  /** 可选：请求服务端自动生成标题 */
  title?: { enabled: boolean }
}

// ---------- 响应：流式事件 ----------

export type StopReason = 'end_turn' | 'max_tokens' | 'tool_use' | 'refusal'

export type StopDetails = {
  /** 固定为拒绝 */
  type: 'refusal'
  /** 服务端拒绝分类，当前恒为 null */
  category: null
  /** 拒绝说明，当前恒为 null */
  explanation: null
}

export type MessageUsage = {
  /** 未命中缓存的输入 Token */
  input_tokens: number
  /** 新建缓存写入的输入 Token */
  cache_creation_input_tokens: number
  /** 命中缓存的输入 Token */
  cache_read_input_tokens: number
  /** message_start 中为 0，message_delta 中为全轮累计值 */
  output_tokens: number
  /** 仅当 message_delta 中有对外输出的搜索结果块时出现 */
  server_tool_use?: { web_search_requests: number; tool_search: number }
}

/** content_block_start 携带的初始内容块；工具块已是完整内容 */
export type OutputBlockStart = TextBlock | ThinkingBlock | ServerToolBlock | ToolUseBlock

export type ContentBlockDelta =
  { type: 'text_delta'; text: string } | { type: 'thinking_delta'; thinking: string } | { type: 'signature_delta'; signature: string } | { type: 'citations_delta'; citation: TextCitation } | { type: 'input_json_delta'; partial_json: string }

/** 流式事件：SSE 的 event 名与 JSON 的 type 相同，以 message_stop 结束，不发送 [DONE] */
export type MessageStreamEvent =
  | {
      type: 'message_start'
      /** id 为不带 msg_ 前缀的 UUID，等于响应头 x-ds-request-id */
      message: { id: string; model: string; usage?: MessageUsage }
    }
  | { type: 'content_block_start'; index: number; content_block: OutputBlockStart }
  | { type: 'content_block_delta'; index: number; delta: ContentBlockDelta }
  | { type: 'content_block_stop'; index: number }
  | {
      type: 'message_delta'
      /** title 仅在开启标题且生成成功时出现；stop_details 仅在 refusal 时出现 */
      delta: {
        stop_reason: StopReason
        stop_sequence: null
        stop_details?: StopDetails
        title?: string
      }
      usage?: MessageUsage
    }
  | { type: 'message_stop' }
  | { type: 'ping' }

/**
 * POST /anthropic/v1/files 的 purpose：PDF 与 Word、PPT 需要服务端做版面解析；
 * 纯文本、代码、表格与电子书不需要解析，用 user_data。
 */
export type FilePurpose = 'rich_layout_recognition' | 'user_data'

/** POST /anthropic/v1/files 的响应 */
export type FileObject = {
  /** Files API 返回的 file_id */
  id: string
  /** 固定为 file */
  type: 'file'
  /** 文件字节数 */
  size_bytes: number
  /** 上传时间（RFC 3339） */
  created_at: string
  /** 原始文件名 */
  filename: string
  /** 服务端识别的 MIME */
  mime_type: string
}

/** 非 2xx 响应体；流中出现只含 error 的无名 data 帧时同样按此解析 */
export type ApiErrorBody = {
  /** 错误对象 */
  error: {
    /** 错误描述 */
    message: string
    /** 错误类型，服务端可选返回 */
    type?: string
    /** 出错的参数名 */
    param?: string | null
    /** 错误码 */
    code?: string | null
  }
}

/**
 * 客户端错误分类。原实现放在 `client.ts`，这里先随协议类型一起定义，
 * 等网络层移植后由 `client.ts`/`errors.ts` 从这里引用，避免两处各写一份。
 */
export type ApiErrorKind =
  /** 非 2xx 响应 */
  | 'http'
  /** 流中返回的错误帧（如等待生成超时），随后连接关闭 */
  | 'stream'
  /** 请求没有到达服务端（断网、跨域被拦截等） */
  | 'network'
  /** 流在 message_stop 之前结束 */
  | 'interrupted'
  /** 响应不符合协议（如非 SSE 响应） */
  | 'protocol'
