/**
 * 基于 Redis 的 Agent 短期记忆 
 *
 * 模式：
 * - invoke 前：从 Redis 读取该会话的 messages
 * - invoke 后：把 agent 返回的 messages 写回 Redis（带 TTL）
 * - 压缩：由 langchain summarizationMiddleware 在 agent 内部完成
 *
 * 前置：docker compose up -d redis
 *
 * 运行：node src/agent-with-redis-memory.mjs
 * 输入 exit / quit / :q 退出；:clear 清空当前会话记忆
 */
import "dotenv/config";
import Redis from "ioredis";
import * as readline from "node:readline/promises";
import { stdin , stdout } from "node:process";
import { ChatOpenAI } from "@langchain/openai";
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import { createAgent, HumanMessage, summarizationMiddleware } from "langchain";

const REDIS_HOST = process.env.REDIS_HOST ?? "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_DB = Number(process.env.REDIS_DB ?? 0);
const MEMORY_TTL = Number(process.env.MEMORY_TTL_SECONDS ?? 1800);
const KEY_PREFIX = process.env.MEMORY_KEY_PREFIX ?? "agent:short_memory";
const SESSION_ID = process.env.MEMORY_SESSION_ID ?? "demo_user_001";

const summaryPrompt = `你是对话摘要助手。请用中文总结以下对话，包含：
1. 讨论的主要话题
2. 用户提到的重要事实（姓名、偏好、日期等，务必保留原文信息）
3. 继续对话所需的关键上下文

保持简洁，不要编造，不要遗漏用户明确说过的信息。

待摘要的对话：
{messages}

摘要：`;

class RedisMessageStore {
  constructor({ redis, keyPrefix, ttlSeconds }) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.ttlSeconds = ttlSeconds;
  }

  messagesKey(sessionId) {
    return `${this.keyPrefix}:${sessionId}:messages`;
  }

  // 获取指定会话的消息列表，返回 ChatMessage 数组
  async loadMessages(sessionId) {
    const raw = await this.redis.get(this.messagesKey(sessionId));
    if (!raw) return [];
    return mapStoredMessagesToChatMessages(JSON.parse(raw)); // mapStoredMessagesToChatMessages 将存储的消息对象转换为 ChatMessage 对象
  }

  // 保存消息
  async saveMessages(sessionId, messages) {
    const payload = JSON.stringify(mapChatMessagesToStoredMessages(messages)); // mapChatMessagesToStoredMessages 将 ChatMessage 对象转换为可存储的 redis 消息对象
    await this.redis.set(this.messagesKey(sessionId), payload, "EX", this.ttlSeconds);
  }

  // 清空指定会话的消息
  async clear(sessionId) {
    await this.redis.del(this.messagesKey(sessionId));
  }

  // 获取指定会话的消息 TTL，TTL 为 -1 表示没有设置过期时间，为 -2 表示 key 不存在
  async ttl(sessionId) {
    return this.redis.ttl(this.messagesKey(sessionId));
  }
}

async function invokeWithMemory(agent, store, sessionId, userText) {
  const history = await store.loadMessages(sessionId);
  console.log(`  ↳ 从 Redis 加载 ${history.length} 条历史`);

  const result = await agent.invoke(
    { messages: [...history, new HumanMessage(userText)] },
    { recursionLimit: 30 },
  );

  await store.saveMessages(sessionId, result.messages);
  const ttl = await store.ttl(sessionId);
  console.log(`  ↳ 写回 Redis ${result.messages.length} 条 (TTL ${ttl}s)`);

  return result;
}

/**
 * 连接 Redis 并创建 RedisMessageStore 实例
*/
const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT, db: REDIS_DB });

redis.on("connect", () => console.log("✅ Redis 已连接"));
redis.on("error", (err) => console.error("❌ Redis 错误:", err.message));

const store = new RedisMessageStore({
  redis,
  keyPrefix: KEY_PREFIX,
  ttlSeconds: MEMORY_TTL,
});

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  temperature: 0,
});

const agent = createAgent({
  model,
  tools: [],
  systemPrompt:
    "你是会话助手。记住用户提到的关键事实，中文简短回答。若消息中有对话摘要，请据此继续对话。",
  middleware: [
    // 这个中间件会在 agent 内部自动触发压缩，避免消息数过多导致 token 超限
    summarizationMiddleware({
      model,
      summaryPrompt,
      trigger: { messages: 8 },
      keep: { messages: 4 },
    }),
  ],
});

console.log("输入 exit / quit / :q 退出，:clear 清空记忆\n");

const rl = readline.createInterface({ input: stdin, output: stdout });
let prevCount = (await store.loadMessages(SESSION_ID)).length;

try {   
  while (true) {
    const userText = (await rl.question("你: ")).trim(); // 用户输入
    if (!userText) continue;

    if (["exit", "quit", ":q"].includes(userText.toLowerCase())) break;

    if (userText === ":clear") {
      await store.clear(SESSION_ID);
      prevCount = 0;
      console.log("已清空当前会话记忆\n");
      continue;
    }

    const { messages } = await invokeWithMemory(agent, store, SESSION_ID, userText);
    console.log("\n助手:", messages.at(-1)?.content);
    console.log(`当前消息数: ${messages.length}`);
    if (messages.length < prevCount + 2) {
      console.log("  ⚡ 已触发压缩");
    }
    prevCount = messages.length;
    console.log();
  }
} finally {
  rl.close();
}

await redis.quit();
