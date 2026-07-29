import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, AIMessageChunk, createAgent, HumanMessage, SystemMessage, ToolMessage } from 'langchain';
import { UIMessage } from 'ai';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';

@Injectable()
export class AiService {
  private readonly agent: ReturnType<typeof createAgent>;

  constructor(
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: any,
    @Inject('SEND_MAIL_TOOL') private readonly sendMailTool: any,
    @Inject('CHAT_MODEL') model: ChatOpenAI
  ) {
    // 创建一个 LangChain 代理，内置 ReAct 式 Agent 循环
    this.agent = createAgent({
        model,
        tools: [this.webSearchTool, this.sendMailTool],
        systemPrompt:
          '你是 AI 助手，需要最新信息、事实核查或联网信息时，请使用 web_search 工具搜索后再作答。发送邮件用 send_mail 工具',
      });
  }

  async stream(messages: UIMessage[]) {
    // 把传入的 ai sdk 的 messages 转成 langchain 的 BaseMessage 传给 agent
    const lcMessages = await toBaseMessages(messages);
    // 再把返回的 stream 转成 ai ask 的 ui message stream 返回
    // 这样返回的流式内容就是 SSE 的 Data Stream Protocol 的协议数据了。
    const lgStream = await this.agent.stream(
      { messages: lcMessages },
      {
        streamMode: ['messages', 'values'],
        recursionLimit: 30,
      },
    );

    return toUIMessageStream(lgStream as AsyncIterable<AIMessageChunk>);
  }
}
