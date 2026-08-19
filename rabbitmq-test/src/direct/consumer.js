import { connect } from '../config.js';

const EXCHANGE = 'doc.task.direct';

/** 通过命令行参数指定要绑定的 routing key，不传时默认 info。 */
const routingKey = process.argv[2] || 'error';

/** 队列名按 key 区分，方便在管理台一眼看出各自在听什么 */
const QUEUE = `doc.task.${routingKey}`;

/**
 * direct 消费者：只接收 binding key === 消息 routing key 的消息。
 *
 * 绑定关系示意：
 *   Queue(doc.task.info)    --bind key=info-->    Exchange(direct)
 *   Queue(doc.task.error)   --bind key=error-->   Exchange(direct)
 *
 * 发 routingKey=info 的消息 → 只进 doc.task.info
 * 发 routingKey=error 的消息 → 只进 doc.task.error
 */
async function main() {
  const { channel } = await connect();

  // assertExchange：确保交换机存在
  await channel.assertExchange(EXCHANGE, 'direct', { durable: true });
  // assertQueue：确保队列存在
  await channel.assertQueue(QUEUE, { durable: true });

  /**
   * bindQueue：把队列绑到交换机上，形成「路由规则」(关键)。
   * 第三个参数 binding key：direct 模式下必须与发布时的 routing key 完全一致。
   * 「info」绑「info」能收到；绑「error」则永远收不到 info 消息。
   */
  await channel.bindQueue(QUEUE, EXCHANGE, routingKey);

  console.log(`[direct] 消费者监听队列=${QUEUE}, routingKey=${routingKey}`);

  // consume：监听队列，收到消息就回调处理。
  channel.consume(QUEUE, (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    console.log(`[direct/${routingKey}] 收到:`, data);
    // ack：告诉 Broker 消息已处理完毕，可以从队列里删除。
    channel.ack(msg);
  });
}

main().catch(console.error);
