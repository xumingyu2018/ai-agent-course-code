import { createCodePlugin } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { Streamdown, type ThemeInput } from 'streamdown'
import 'streamdown/styles.css'
import './StreamdownText.css'

const shikiTheme: [ThemeInput, ThemeInput] = ['github-light', 'github-dark']

const codePlugin = createCodePlugin({ themes: shikiTheme })

export type StreamdownTextProps = {
  children: string
  /** 助手最后一段文本在流式输出时为 true，用于 Streamdown 动画与未闭合 Markdown */
  isStreaming?: boolean
}

export function StreamdownText({
  children,
  isStreaming = false,
}: StreamdownTextProps) {
  return (
    <div className="chat-streamdown">
      {/* streamdown 流式 markdown 文本组件 */}
      {/* isStreaming 为 true 时，表示当前文本正在流式输出，mode 为 streaming 时表示当前模式为流式，parseIncompleteMarkdown 表示是否解析不完整的 Markdown */}
      {/* shikiTheme 用于设置代码高亮主题，plugin 用于扩展功能（mermaid 为扩展流程图能力，codePlugin 为扩展代码高亮能力） */}
      <Streamdown
        mode="streaming"
        isAnimating={isStreaming}
        parseIncompleteMarkdown
        shikiTheme={shikiTheme}
        plugins={{ mermaid, code: codePlugin }}
        className="chat-streamdown__inner"
      >
        {children}
      </Streamdown>
    </div>
  )
}
