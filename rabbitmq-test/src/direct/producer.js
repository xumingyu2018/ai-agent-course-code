import { connect } from '../config.js';

const EXCHANGE = 'doc.task.direct';

/**
 * ========== direct 交换机 ==========
 *
 * 行为：消息的 routing key 必须与队列绑定时的 binding key「完全相等」才会投递。
 *       一对多也可以：多个队列绑同一个 key，会同时收到（类似按 key 分组的广播）。
 *
 * 对比 fanout：
 *   - fanout：所有绑定队列都收，不看 key
 *   - direct：只有 key 对得上的队列才收
 *
 * 本示例：用 info / warning / error 三条路由，模拟不同级别的文档任务通知。
 */
async function main() {
  const { connection, channel } = await connect();

  await channel.assertExchange(EXCHANGE, 'direct', { durable: true });

  const tasks = [
    { routingKey: 'info', body: { level: 'info', text: '文档解析完成' } },
    { routingKey: 'warning', body: { level: 'warning', text: '文档页数过多，耗时较长' } },
    { routingKey: 'error', body: { level: 'error', text: 'OCR 识别失败' } },
  ];

  for (const task of tasks) {
    /**
     * 第二个参数就是 routing key。
     * Exchange 会拿它去和各队列的 binding key 做精确匹配，决定投递到哪些 Queue。
     */
    channel.publish(
      EXCHANGE,
      task.routingKey,
      Buffer.from(JSON.stringify(task.body)),
      { persistent: true, contentType: 'application/json' },
    );
    console.log(`[direct producer] 发送 routingKey=${task.routingKey}:`, task.body);
  }

  setTimeout(async () => {
    await channel.close();
    await connection.close();
  }, 500);
}

main().catch(console.error);
