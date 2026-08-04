import "dotenv/config";
import { ask } from "./02_rag_agent.mjs";

const DEFAULT_QUESTIONS = [
  "无理由退货要在几天内？",
  "满多少元包邮？",
  "金卡会员有什么折扣？",
  "电子发票多久能开好？",
  "手机保修多久？",
  "紧急问题怎么联系客服？",
];

const args = process.argv.slice(2);
const questions = args.length > 0 ? [args.join(" ")] : DEFAULT_QUESTIONS;

function printContext(context) {
  if (!context.length) {
    console.log("\n引用片段: （无）");
    return;
  }
  console.log("\n引用片段:");
  context.forEach((doc, i) => {
    const source = doc.metadata?.source ?? "未知";
    const text = doc.pageContent.replace(/\s+/g, " ").trim();
    const preview = text.length > 100 ? `${text.slice(0, 100)}…` : text;
    console.log(`  [${i + 1}] ${source}`);
    console.log(`      ${preview}`);
  });
}

for (let i = 0; i < questions.length; i++) {
  const question = questions[i];
  console.log(`\n${"=".repeat(50)}`);
  console.log(`问题 ${i + 1}: ${question}`);

  const { answer, context } = await ask(question);
  console.log(`\n答: ${answer}`);
  printContext(context);
}

console.log(`\n${"=".repeat(50)}`);
console.log(`共 ${questions.length} 个问题`);
