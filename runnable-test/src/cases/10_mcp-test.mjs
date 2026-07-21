import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence, RunnableLambda, RunnableBranch, RunnablePassthrough } from '@langchain/core/runnables';

const model = new ChatOpenAI({ 
    modelName: "qwen-plus",
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        "amap-maps-streamableHTTP": {
            "url": "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY
        },
        "chrome-devtools": {
            "command": "npx",
            "args": [
                "-y",
                "chrome-devtools-mcp@latest"
            ]
        },
    }
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个可以调用 MCP 工具的智能助手。"],
    new MessagesPlaceholder("messages"), 
]);

const llmChain = prompt.pipe(modelWithTools);

// 1. 定义处理工具调用的逻辑 (封装为 Runnable)，RunnableLambda 可以直接把一个函数包装成 Runnable，让它拥有.invoke()、.pipe()、.map() 等方法
// 这是另一个 chain，这样可以直接放进 LangChain 的流水线
const toolExecutor = new RunnableLambda({
    func: async (input) => {
        const { response, tools } = input;
        const toolResults = [];

        for (const toolCall of response.tool_calls ?? []) {
            const foundTool = tools.find(t => t.name === toolCall.name);
            if (!foundTool) continue;

            const toolResult = await foundTool.invoke(toolCall.args);

            // 兼容不同返回格式的字符串化
            const contentStr = typeof toolResult === 'string'
                ? toolResult
                : (toolResult?.text || JSON.stringify(toolResult));

            toolResults.push(new ToolMessage({
                content: contentStr,
                tool_call_id: toolCall.id,
            }));
        }

        return toolResults;
    }
});

// 2. 对结果的处理
const agentStepChain = RunnableSequence.from([
    // step1: 将 LLM 输出挂到 state.response 上，RunnablePassthrough.assign 的作用是把上一步的输出挂到 state 上，方便后续 RunnableBranch 分支判断
    // 这里相当于 Object.assign(...state, { response: llmChain })，复制一份 state，添加 response 字段
    RunnablePassthrough.assign({
        response: llmChain,
    }),
    // step2: 使用 RunnableBranch 根据是否有 tool_calls 走不同分支
    RunnableBranch.from([
        // 分支1：没有 tool_calls，认为本轮已经完成
        [
            (state) =>
                !state.response?.tool_calls ||
                state.response.tool_calls.length === 0,
            new RunnableLambda({
                func: async (state) => {
                    const { messages, response } = state;
                    const newMessages = [...messages, response];
                    return {
                        ...state,
                        messages: newMessages,
                        done: true, // 标记本轮完成，生成最终回复
                        final: response.content,
                    };
                },
            }),
        ],
        // 默认分支：有 tool_calls，调用工具并把 ToolMessage 写回 messages
        RunnableSequence.from([
            new RunnableLambda({
                func: async (state) => {
                    const { messages, response } = state;
                    const newMessages = [...messages, response];

                    console.log(
                        chalk.bgBlue(
                            `🔍 检测到 ${response.tool_calls.length} 个工具调用`
                        )
                    );
                    console.log(
                        chalk.bgBlue(
                            `🔍 工具调用: ${response.tool_calls
                                .map((t) => t.name)
                                .join(', ')}`
                        )
                    );

                    return {
                        ...state,
                        messages: newMessages,
                    };
                },
            }),
            // 调用工具执行器，得到 toolMessages，用 RunnablePassthrough.assign 把执行结果加到 toolMessage 属性上
            RunnablePassthrough.assign({
                toolMessages: toolExecutor,
            }),
            new RunnableLambda({
                func: async (state) => {
                    const { messages, toolMessages } = state;
                    return {
                        ...state,
                        messages: [...messages, ...(toolMessages ?? [])],
                        done: false,
                    };
                },
            }),
        ]),
    ]),
]);

async function runAgentWithTools(query, maxIterations = 30) {
    // 加了一个 state 在多个 Runnable 之间传递，记录了 messages 数组、是否 done、以及最终的回复 final 以及所有 tools
    let state = {
        messages: [new HumanMessage(query)],
        done: false,
        final: null,
        tools,
    };

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

        // 每一轮都通过一个完整的 Runnable chain（LLM + 工具调用处理）
        state = await agentStepChain.invoke(state); // 自动执行所有的 Runnable

        if (state.done) {
            console.log(`\n✨ AI 最终回复:\n${state.final}\n`);
            return state.final;
        }
    }

    return state.messages[state.messages.length - 1].content;
}

await runAgentWithTools("北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名");

// await mcpClient.close();
