import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';

/**
 * 下面是最初版本的内联工具定义，只是保留做参考，不再实际使用。
 *
 * const database = {
 *   users: {
 *     '001': { id: '001', name: '张三', email: 'zhangsan@example.com', role: 'admin' },
 *     '002': { id: '002', name: '李四', email: 'lisi@example.com', role: 'user' },
 *     '003': { id: '003', name: '王五', email: 'wangwu@example.com', role: 'user' },
 *   },
 * };
 *
 * const queryUserArgsSchema = z.object({
 *   userId: z.string().describe('用户 ID，例如: 001, 002, 003'),
 * });
 *
 * type QueryUserArgs = {
 *   userId: string;
 * };
 *
 * const queryUserTool = tool(
 *   async ({ userId }: QueryUserArgs) => {
 *     const user = database.users[userId];
 *
 *     if (!user) {
 *       return `用户 ID ${userId} 不存在。可用的 ID: 001, 002, 003`;
 *     }
 *
 *     return `用户信息：\n- ID: ${user.id}\n- 姓名: ${user.name}\n- 邮箱: ${user.email}\n- 角色: ${user.role}`;
 *   },
 *   {
 *     name: 'query_user',
 *     description:
 *       '查询数据库中的用户信息。输入用户 ID，返回该用户的详细信息（姓名、邮箱、角色）。',
 *     schema: queryUserArgsSchema,
 *   },
 * );
 */

@Injectable()
export class AiService {
  // 第一个类型参数 BaseMessage[] 是输入，第二个类型参数 AIMessage 是输出
  private readonly modelWithTools: Runnable<BaseMessage[], AIMessage>;

  constructor(
    @Inject('CHAT_MODEL') model: ChatOpenAI,
    @Inject('QUERY_USER_TOOL') private readonly queryUserTool: any, //  tool 里调用 查询用户的 service
    @Inject('SEND_MAIL_TOOL') private readonly sendMailTool: any,
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: any,
    @Inject('DB_USERS_CRUD_TOOL') private readonly dbUsersCrudTool: any,
    @Inject('TIME_NOW_TOOL') private readonly timeNowTool: any,
    @Inject('CRON_JOB_TOOL') private readonly cronJobTool: any,
  ) {
    this.modelWithTools = model.bindTools([
      this.queryUserTool, // 查询用户信息工具
      this.sendMailTool, // 发送邮件工具
      this.webSearchTool, // 互联网搜索工具
      this.dbUsersCrudTool, // 数据库 users 表读写工具
      this.timeNowTool, // 获取当前服务器时间工具
      this.cronJobTool, // 定时任务工具
    ]);
  }

  async runChain(query: string): Promise<string> {
    const messages: BaseMessage[] = [
      new SystemMessage(
        `你是一个通用任务助手，可以根据用户的目标规划步骤，并在需要时调用工具：\`query_user\` 查询或校验用户信息、\`send_mail\` 发送邮件、\`web_search\` 进行互联网搜索、\`db_users_crud\` 读写数据库 users 表、\`time_now\` 获取当前服务器时间、\`cron_job\` 创建和管理定时/周期任务（\`list\`/\`add\`/\`toggle\`），从而实现提醒、定期任务、数据同步等各种自动化需求。

          定时任务类型选择规则（非常重要）：
          - 用户说“X分钟/小时/天后”“在某个时间点”“到点提醒”（一次性）=> 用 \`cron_job\` + \`type=at\`（执行一次后自动停用），\`at\`=当前时间+X 或解析出的时间点
          - 用户说“每X分钟/每小时/每天”“定期/循环/一直”（重复执行）=> 用 \`cron_job\` + \`type=every\`（每次执行），\`everyMs\`=X换算成毫秒
          - 用户给出 Cron 表达式或明确说“用 cron 表达式”（重复执行）=> 用 \`cron_job\` + \`type=cron\`

          在调用 \`cron_job.add\` 创建任务时，需要把用户原始自然语言拆成两部分：一部分是“什么时候执行”（用来决定 type/at/everyMs/cron），另一部分是“要做什么任务本身”。\`instruction\` 字段只能填“要做什么”的那部分文本（保持原语言和原话），不能再改写、翻译或总结。

          当用户请求“在未来某个时间点执行某个动作”（例如“1分钟后给我发一个笑话到邮箱”）时，本轮对话只需要使用 \`cron_job\` 设置/更新定时任务，不要在当前轮直接完成这个动作本身：不要直接调用 \`send_mail\` 给他发邮件，也不要在当前轮就真正“执行”指令，只需把要执行的动作写进 \`instruction\` 里，交给将来的定时任务去跑。

          重要：\`cron_job.add\` 的 \`instruction\` 必须是自然语言任务描述，不能写成工具调用/脚本（例如禁止 \`send_mail(...)\`、\`db_users_crud(...)\`、\`web_search(...)\`）。工具调用应该由将来的 JobAgent 在执行时自行决定。

          注意：像“\`1分钟后提醒我喝水\`”，时间相关信息用于计算下一次执行时间，而 \`instruction\` 应该是“提醒我喝水”；本轮不需要立刻提醒。`,
      ),
      new HumanMessage(query),
    ];

    // 需要一个 agent loop 来循环调用 tools，直到模型不再提出工具调用为止
    while (true) {
      const aiMessage = await this.modelWithTools.invoke(messages);
      messages.push(aiMessage);

      const toolCalls = aiMessage.tool_calls ?? [];

      // 没有要调用的工具，直接把回答返回给调用方
      if (!toolCalls.length) {
        return aiMessage.content as string;
      }

      // 依次执行本轮需要调用的所有工具
      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id || '';
        const toolName = toolCall.name;

        if (toolName === 'query_user') {
          const result = await this.queryUserTool.invoke(toolCall.args); //  tool 里调用 查询用户工具 service

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'db_users_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args);

          // 为什么要放到 messages 里？因为模型在下一轮可能会根据这个结果继续思考和调用工具，所以需要把工具调用的结果作为上下文传给模型
          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'time_now') {
          const result = await this.timeNowTool.invoke({});

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: JSON.stringify(result),
            }),
          );
        } else if (toolName === 'cron_job') {
          const result = await this.cronJobTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        }
      }
    }
  }

  // 流式调用版本
  async *runChainStream(query: string): AsyncIterable<string> {
    const messages: BaseMessage[] = [
      new SystemMessage(
        `你是一个通用任务助手，可以在需要时调用工具（如 \`query_user\`、\`db_users_crud\`、\`send_mail\`、\`web_search\`、\`time_now\`、\`cron_job\` 等）来查询或改写数据/配置，规划并执行各种任务（包括提醒、定期任务和一系列后台操作），再用结果回答用户的问题。

        定时任务类型选择规则（非常重要）：
        - “X分钟/小时/天后”“在某个时间点”“到点提醒”（一次性）=> \`cron_job.type=at\`（执行一次后自动停用）
        - “每X分钟/每小时/每天”“定期/循环/一直”（重复执行）=> \`cron_job.type=every\`（每次执行），\`everyMs\`=毫秒
        - 给出 Cron 表达式 => \`cron_job.type=cron\``,
      ),
      new HumanMessage(query),
    ];

    while (true) {
      // 一轮对话：先让模型思考并（可能）提出工具调用
      const stream = await this.modelWithTools.stream(messages);

      let fullAIMessage: AIMessageChunk | null = null;

      //   for await (const chunk of stream as AsyncIterable<AIMessageChunk>) {
      //     // 使用 concat 持续拼接，得到本轮完整的 AIMessageChunk
      //     fullAIMessage = fullAIMessage ? fullAIMessage.concat(chunk) : chunk;

      //     const hasToolCallChunk =
      //       !!fullAIMessage.tool_call_chunks &&
      //       fullAIMessage.tool_call_chunks.length > 0;

      //     // 只要当前轮次还没出现 tool 调用的 chunk，就可以把文本内容流式往外推
      //     if (!hasToolCallChunk && chunk.content) {
      //         yield chunk.content as string
      //     }
      //   }
      // stream 返回的是一个个 chunk
      for await (const chunk of stream as AsyncIterable<AIMessageChunk>) {
        fullAIMessage = fullAIMessage ? fullAIMessage.concat(chunk) : chunk;

        // 只要 fullAIMessage 里一旦出现了任何工具调用的影子
        const isToolCalling = (fullAIMessage.tool_call_chunks?.length ?? 0) > 0;

        // 判断如果没有 tool_call_chunks 代表不是工具调用，那就直接 yield 返回内容
        if (!isToolCalling && chunk.content) {
          yield chunk.content as string;
        }
      }

      if (!fullAIMessage) {
        return;
      }

      messages.push(fullAIMessage);

      const toolCalls = fullAIMessage.tool_calls ?? [];

      // 没有工具调用：说明这一轮就是最终回答，已经在上面的 for-await 中流完了，可以结束
      if (!toolCalls.length) {
        return;
      }

      // 有工具调用：本轮我们不再额外输出内容，而是执行工具，生成 ToolMessage，进入下一轮
      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id || '';
        const toolName = toolCall.name;

        if (toolName === 'query_user') {
          const result = await this.queryUserTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'db_users_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        } else if (toolName === 'time_now') {
          const result = await this.timeNowTool.invoke({});

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: JSON.stringify(result),
            }),
          );
        } else if (toolName === 'cron_job') {
          const result = await this.cronJobTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCallId,
              name: toolName,
              content: result,
            }),
          );
        }
      }
    }
  }
}
