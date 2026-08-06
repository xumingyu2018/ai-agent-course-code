import Redis from 'ioredis';

// 创建 Redis 客户端
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0
});

// 监听连接
redis.on('connect', () => {
  console.log('✅ ioredis 连接成功（mjs 版）');
});

// 错误监听
redis.on('error', (err) => {
  console.error('❌ Redis 连接失败：', err);
});

// 执行操作
async function runRedisDemo() {
  try {
    // =========================
    // 1. String 字符串
    // set key value [EX seconds] [PX milliseconds] [NX|XX] (EX: 设置过期时间，NX: 仅当键不存在时设置，XX: 仅当键存在时设置，PX: 设置过期时间，单位为毫秒)
    // get key
    // 例子：set lock:order:2001 "locked" ex 10 nx
    // =========================
    await redis.set('name', '张三');
    await redis.set('code', '6666', 'EX', 300); // 5 分钟过期
    console.log('String name:', await redis.get('name'));

    // =========================
    // 2. Hash 哈希
    // hset key field1 value1 [field2 value2 ...]
    // hget key field
    // 例子：hset user:1001 name "李四" age 28
    // =========================
    await redis.hset('user:1001', 'name', '李四', 'age', 28);
    console.log('Hash user:', await redis.hgetall('user:1001'));

    // =========================
    // 3. List 列表
    // lpush key value1 [value2 ...] (从左边插入)
    // rpush key value1 [value2 ...] (从右边插入)
    // lpop key
    // rpop key
    // 例子：lpush task:list "任务1" "任务2"
    // =========================
    await redis.lpush('task:list', '任务1', '任务2');
    await redis.rpush('task:list', '任务3');
    console.log('List:', await redis.lrange('task:list', 0, -1));

    // =========================
    // 4. Set 集合
    // sadd key member1 [member2 ...]
    // smembers key (获取集合中的所有成员)
    // 例子：sadd tag:set "redis" "nest" "node"
    // =========================
    await redis.sadd('tag:set', 'redis', 'nest', 'node');
    console.log('Set:', await redis.smembers('tag:set'));

    // =========================
    // 5. ZSet 有序集合
    // zadd key score1 member1 [score2 member2 ...]
    // zrange key start stop [WITHSCORES] (获取指定范围的成员)
    // 例子：zadd score:rank 99 "小明" 95 "小红"
    // =========================
    await redis.zadd('score:rank', 99, '小明', 95, '小红');
    console.log('ZSet 排名:', await redis.zrange('score:rank', 0, -1));

    // =========================
    // 6. 分布式锁（标准写法）
    // set lock:key value [EX seconds] [PX milliseconds] [NX|XX]
    // =========================
    const lockKey = 'lock:order:1001';
    const lockResult = await redis.set(lockKey, 'locked', 'NX', 'EX', 10);
    console.log('分布式锁:', lockResult ? '加锁成功' : '加锁失败');

  } catch (err) {
    console.error('执行异常：', err);
  }
}

// 运行
runRedisDemo();
