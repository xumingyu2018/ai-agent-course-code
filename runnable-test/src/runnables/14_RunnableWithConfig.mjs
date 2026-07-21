import "dotenv/config";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

// 模拟一个简单的"用户数据库"
const mockUsers = new Map([
  [
    "user-123",
    {
      id: "user-123",
      name: "神光",
      email: "guang@example.com",
    },
  ],
]);

// 节点1：根据 config.configurable.userId 查用户
const fetchUserFromConfig = RunnableLambda.from(async (input, config) => {
  const userId = config?.configurable?.userId;

  console.log("【节点1】收到了通知内容:", input);
  console.log("【节点1】从 config 里拿到 userId:", userId);

  const user = userId ? mockUsers.get(userId) : null;

  if (!user) {
    throw new Error("未找到用户，无法发送通知");
  }

  return {
    user,
    notification: input,
  };
});

// 节点2：根据 config.configurable.role 做权限判断
const checkPermissionByRole = RunnableLambda.from(async (state, config) => {
  const role = config?.configurable?.role ?? "普通用户";

  console.log("【节点2】当前角色:", role);

  const canSend =
    role === "管理员" ||
    role === "运营" ||
    role === "系统";

  if (!canSend) {
    throw new Error(`角色「${role}」无权限发送系统通知`);
  }

  return {
    ...state,
    role,
  };
});

// 节点3：根据 locale 生成最终通知文案
const formatNotificationByLocale = RunnableLambda.from(async (state, config) => {
  const locale = config?.configurable?.locale ?? "zh-CN";

  console.log("【节点3】locale:", locale);

  let content;
  if (locale === "en-US") {
    content = `Dear ${state.user.name},\n\n${state.notification}\n\n(from role: ${state.role})`;
  } else {
    content = `亲爱的 ${state.user.name}，\n\n${state.notification}\n\n（发送人角色：${state.role}）`;
  }

  return {
    ...state,
    locale,
    finalContent: content,
  };
});

// 把三个节点串起来
const chain = RunnableSequence.from([
  fetchUserFromConfig,
  checkPermissionByRole,
  formatNotificationByLocale,
]);

// 使用 withConfig 为整个 chain 绑定统一的配置
const chainWithConfig = chain.withConfig({
  tags: ["demo", "withConfig", "notification"],
  metadata: {
    demoName: "RunnableWithConfig",
  },
  configurable: {
    userId: "user-123",
    role: "管理员",
    locale: "zh-CN",
  },
});

// 再创建一个不同配置的 chainWithConfig2，使用英文 locale
const chainWithConfig2 = chain.withConfig({
  tags: ["demo", "withConfig", "notification-en"],
  metadata: {
    demoName: "RunnableWithConfig2",
  },
  configurable: {
    userId: "user-123",
    role: "运营",
    locale: "en-US",
  },
});

// 输入为"要发送的通知文案"
// 在第一个节点根据配置拿用户信息，第二个节点根据配置做权限判断，第三个节点根据配置返回不同语言的内容
// 通过 withConfig 可以给 chain 的每个节点加上配置信息，可以通过第二个参数取出来用
const result = await chainWithConfig.invoke("你有一条新的系统通知，请及时查看。");
console.log("✅ 最终通知内容:\n", result.finalContent);

console.log("\n--- chainWithConfig2 ---\n");

const result2 = await chainWithConfig2.invoke("System maintenance scheduled tonight.");
console.log("✅ 最终通知内容:\n", result2.finalContent);

