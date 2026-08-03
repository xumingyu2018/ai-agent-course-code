# Neo4j Cypher 语法教学

Cypher 是 Neo4j 的声明式图查询语言，类似 SQL 之于关系型数据库。它的核心思想是**用 ASCII 图形来描述图模式**：

- `()` 圆括号表示**节点**（Node）
- `[]` 方括号表示**关系**（Relationship）
- `->` 箭头表示**关系方向**

一句话记忆：`(节点)-[关系]->(节点)`，长得像什么，查的就是什么。

---

## 一、基本元素

### 1. 节点（Node）

```cypher
()                          // 匿名节点，不关心它是什么
(p)                         // 变量 p，后续语句可引用
(:Product)                  // 带标签 Label 的节点（类似"表名"/"类型"）
(p:Product)                 // 变量 + 标签
(p:Product {name: "珍珠奶茶"})  // 变量 + 标签 + 属性
(p:Product:Hot)             // 一个节点可以有多个标签
```

- **标签（Label）**：节点的分类，如 `Product`、`Ingredient`，一个节点可有多个
- **属性（Property）**：键值对，写在 `{}` 中，如 `{name: "珍珠", price: 3}`

### 2. 关系（Relationship）

```cypher
-->                         // 匿名有向关系
-[r]->                      // 变量 r
-[:包含]->                  // 带类型 Type 的关系
-[r:包含]->                 // 变量 + 类型
-[r:包含 {amount: "50g"}]-> // 关系也可以有属性
--                          // 无方向（查询时表示"不限方向"）
```

- 关系**必须有类型**（创建时），且**必须有方向**（创建时）
- 查询时可以忽略方向：`(a)-[:包含]-(b)`

### 3. 路径（Path）

```cypher
(a)-[:属于]->(b)                    // 一跳
(a)-[:包含]->(b)-[:使用]->(c)       // 两跳（多跳查询，GraphRAG 的核心能力）
(a)-[:包含*1..3]->(b)               // 变长路径：1 到 3 跳
p = (a)-[:包含*]->(b)               // 把整条路径赋给变量 p
```

---

## 二、增：CREATE 与 MERGE

### 1. CREATE —— 无条件创建

```cypher
// 创建一个节点
CREATE (p:Product {name: "珍珠奶茶"})

// 一条语句创建多个节点
CREATE (a:Ingredient {name: "珍珠"}), (b:Ingredient {name: "红茶"})

// 创建节点的同时创建关系
CREATE (p:Product {name: "杨枝甘露"})-[:包含]->(i:Ingredient {name: "芒果"})

// 给已存在的节点建关系：先 MATCH 再 CREATE
MATCH (p:Product {name: "珍珠奶茶"}), (i:Ingredient {name: "珍珠"})
CREATE (p)-[:包含]->(i)
```

⚠️ 注意：`CREATE` 不查重，执行两次就会有两个"珍珠奶茶"节点。

### 2. MERGE —— 存在则匹配，不存在则创建（防重复）

```cypher
// 如果"珍珠奶茶"已存在则复用，不存在才创建
MERGE (p:Product {name: "珍珠奶茶"})

// 配合 ON CREATE / ON MATCH 区分处理
MERGE (p:Product {name: "珍珠奶茶"})
ON CREATE SET p.created = timestamp()   // 只在新建时执行
ON MATCH  SET p.visited = true          // 只在匹配到时执行

// 防止重复建关系（知识图谱导入数据的标准写法）
MATCH (p:Product {name: "珍珠奶茶"}), (i:Ingredient {name: "珍珠"})
MERGE (p)-[:包含]->(i)
```

💡 实战建议：批量导入知识图谱数据时，**节点和关系都用 MERGE**，保证幂等。

---

## 三、查：MATCH / WHERE / RETURN

### 1. 基本查询

```cypher
// 查所有 Product 节点
MATCH (p:Product)
RETURN p

// 按属性查（写在模式里）
MATCH (p:Product {name: "珍珠奶茶"})
RETURN p

// 查节点 + 关系 + 对端节点
MATCH (p:Product)-[r:包含]->(i:Ingredient)
RETURN p.name, type(r), i.name
```

### 2. WHERE 过滤

```cypher
MATCH (p:Product)
WHERE p.name = "珍珠奶茶"           // 等值，等价于写在 {} 里
RETURN p

MATCH (i:Ingredient)
WHERE i.price > 2 AND i.price < 10  // 数值比较，支持 AND / OR / NOT
RETURN i

MATCH (p:Product)
WHERE p.name STARTS WITH "珍珠"     // 字符串：STARTS WITH / ENDS WITH / CONTAINS
   OR p.name =~ ".*奶茶"            // 正则匹配
RETURN p

MATCH (p:Product)
WHERE p.name IN ["珍珠奶茶", "杨枝甘露"]   // IN 列表
RETURN p

MATCH (p:Product)
WHERE p.price IS NOT NULL           // 判断属性是否存在
RETURN p

// WHERE 中还能写图模式（存在性判断）
MATCH (p:Product)
WHERE (p)-[:适合]->(:People {name: "学生"})
RETURN p.name
```

### 3. RETURN 的常用姿势

```cypher
RETURN p                    // 返回整个节点
RETURN p.name               // 返回属性
RETURN p.name AS 品名        // 别名
RETURN DISTINCT i.name      // 去重
RETURN p, r, i              // 返回多个，Browser 中可渲染成图
```

### 4. 排序与分页

```cypher
MATCH (i:Ingredient)
RETURN i.name, i.price
ORDER BY i.price DESC       // 排序，默认 ASC
SKIP 10                     // 跳过前 10 条
LIMIT 5                     // 只取 5 条
```

### 5. OPTIONAL MATCH —— 类似 SQL 的 LEFT JOIN

```cypher
// 即使某些 Product 没有"适合"关系，也会返回该 Product，people 为 null
MATCH (p:Product)
OPTIONAL MATCH (p)-[:适合]->(peo:People)
RETURN p.name, peo.name
```

---

## 四、改：SET / REMOVE

```cypher
// 设置 / 修改属性
MATCH (p:Product {name: "珍珠奶茶"})
SET p.price = 12, p.hot = true

// 用 map 批量覆盖（= 全量替换，+= 增量合并）
MATCH (p:Product {name: "珍珠奶茶"})
SET p += {price: 13, size: "500ml"}

// 追加标签
MATCH (p:Product {name: "珍珠奶茶"})
SET p:Bestseller

// 删除属性 / 标签
MATCH (p:Product {name: "珍珠奶茶"})
REMOVE p.hot, p:Bestseller
```

---

## 五、删：DELETE / DETACH DELETE

```cypher
// 删关系
MATCH (p:Product {name: "珍珠奶茶"})-[r:包含]->(:Ingredient {name: "果糖"})
DELETE r

// 删节点（前提：该节点没有任何关系，否则报错）
MATCH (i:Ingredient {name: "芋圆"})
DELETE i

// 删节点并连带删除它的所有关系（最常用）
MATCH (p:Product {name: "珍珠奶茶"})
DETACH DELETE p

// ⚠️ 清空整个数据库（学习环境专用，慎用！）
MATCH (n) DETACH DELETE n
```

---

## 六、聚合与统计

Cypher 的聚合不需要 GROUP BY —— **RETURN 中的非聚合字段自动成为分组键**。

```cypher
// 统计每种奶茶包含几种配料
MATCH (p:Product)-[:包含]->(i:Ingredient)
RETURN p.name, count(i) AS 配料数

// 常用聚合函数
MATCH (i:Ingredient)
RETURN count(i),        // 计数
       count(DISTINCT i.name),
       avg(i.price),    // 平均
       sum(i.price),    // 求和
       min(i.price), max(i.price),
       collect(i.name)  // 聚合成列表 ["珍珠","红茶",...]
```

---

## 七、多跳与路径查询（GraphRAG 核心）

```cypher
// 固定两跳：奶茶 → 配料 → 工艺
MATCH (p:Product {name: "珍珠奶茶"})-[:包含]->(i)-[:使用]->(m)
RETURN p.name, i.name, m.name

// 变长跳数：1~3 跳内所有可达节点（知识扩散/子图召回）
MATCH (p:Product {name: "珍珠奶茶"})-[*1..3]->(n)
RETURN DISTINCT n

// 返回整条路径（Browser 可视化很直观）
MATCH path = (p:Product {name: "珍珠奶茶"})-[*1..2]->()
RETURN path

// 最短路径
MATCH (a:Product {name: "珍珠奶茶"}), (b:People {name: "学生"}),
      path = shortestPath((a)-[*..5]-(b))
RETURN path
```

💡 GraphRAG 检索的本质：先定位实体节点（如"珍珠奶茶"），再通过多跳展开子图，把子图内容作为上下文喂给 LLM。

---

## 八、语句组合：WITH / UNWIND

### 1. WITH —— 管道，把上一段结果传给下一段（类似 SQL 子查询）

```cypher
// 找出配料数量超过 3 的奶茶
MATCH (p:Product)-[:包含]->(i:Ingredient)
WITH p, count(i) AS cnt
WHERE cnt > 3                        // 对聚合结果过滤（类似 HAVING）
RETURN p.name, cnt
```

### 2. UNWIND —— 把列表展开成多行（批量写入常用）

```cypher
// 批量创建配料节点
UNWIND ["珍珠", "芋圆", "椰果", "仙草"] AS name
MERGE (:Ingredient {name: name})

// 配合参数批量导入（代码中传入 $rows）
UNWIND $rows AS row
MERGE (p:Product {name: row.product})
MERGE (i:Ingredient {name: row.ingredient})
MERGE (p)-[:包含]->(i)
```

---

## 九、常用函数速查

| 类别 | 函数 | 说明 |
|------|------|------|
| 节点/关系 | `id(n)` / `elementId(n)` | 内部 ID |
| | `labels(n)` | 节点的标签列表 |
| | `type(r)` | 关系类型 |
| | `properties(n)` | 所有属性（map） |
| | `keys(n)` | 属性名列表 |
| 字符串 | `toUpper()` / `toLower()` / `trim()` | 大小写、去空格 |
| | `split("a,b", ",")` | 分割成列表 |
| | `toString()` / `toInteger()` / `toFloat()` | 类型转换 |
| 列表 | `size(list)` | 长度 |
| | `head()` / `last()` / `range(1,10)` | 取头尾、生成序列 |
| 条件 | `coalesce(p.price, 0)` | 取第一个非 null 值 |
| | `CASE WHEN ... THEN ... ELSE ... END` | 条件表达式 |
| 时间 | `timestamp()` / `date()` / `datetime()` | 时间戳、日期 |

---

## 十、索引与约束（性能与数据质量）

```cypher
// 唯一性约束（知识图谱实体名防重，强烈建议）
CREATE CONSTRAINT product_name IF NOT EXISTS
FOR (p:Product) REQUIRE p.name IS UNIQUE

// 普通索引（加速按属性查找）
CREATE INDEX ingredient_name IF NOT EXISTS
FOR (i:Ingredient) ON (i.name)

// 查看已有索引/约束
SHOW INDEXES
SHOW CONSTRAINTS
```

💡 建了唯一约束后，`MERGE (p:Product {name: ...})` 会走索引，大批量导入速度天差地别。

---

## 十一、实用管理语句

```cypher
CALL db.labels()             // 查看所有标签
CALL db.relationshipTypes()  // 查看所有关系类型
CALL db.propertyKeys()       // 查看所有属性名
CALL db.schema.visualization()  // 可视化图模型（元模型）

MATCH (n) RETURN count(n)             // 节点总数
MATCH ()-[r]->() RETURN count(r)      // 关系总数
```

---

## 十二、与 SQL 的对照记忆

| SQL | Cypher |
|-----|--------|
| `SELECT * FROM product` | `MATCH (p:Product) RETURN p` |
| `WHERE name = 'x'` | `WHERE p.name = 'x'` |
| `INSERT INTO` | `CREATE` / `MERGE` |
| `UPDATE ... SET` | `MATCH ... SET` |
| `DELETE FROM` | `MATCH ... DETACH DELETE` |
| `JOIN` | 关系模式 `(a)-[:REL]->(b)` |
| `LEFT JOIN` | `OPTIONAL MATCH` |
| `GROUP BY` + `HAVING` | 聚合自动分组 + `WITH ... WHERE` |
| `ORDER BY / LIMIT` | `ORDER BY / LIMIT`（一样） |

核心区别：SQL 用 JOIN 在查询时"临时"关联表，Cypher 的关系是**存储层面的一等公民**，多跳遍历不需要连表，这正是图数据库做 GraphRAG 的优势。
