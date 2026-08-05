import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// 用 pg 这个包连接数据库，创建 Pool，用 pool.query 执行 sql
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function query(text, params) {
  return pool.query(text, params);
}

export { pool, query };
