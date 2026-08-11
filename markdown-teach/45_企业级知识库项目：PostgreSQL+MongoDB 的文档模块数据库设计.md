# 企业级知识库项目：PostgreSQL+MongoDB 的文档模块数据库设计

知识库项目会有很多模块，比如用户模块、文档模块、AI 问答模块、知识图谱模块、统计模块等

这节我们先来做一下文档模块。

文档是用户上传的 pdf、txt、音频、视频等文件，解析为文档，用于后续 AI 问答的知识来源。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfeksLs96gmjBlfuJw4669w8FvBibF14MS2OiaV2Pd84q4t3gCk6yqRdxO5Kibh6slv0lXQDia3wZdctHn1sG7vZHMlfT7fqjT27cyY/640?wx_fmt=png&from=appmsg)

针对企业级场景，文档必须有审核流程：

员工上传的文件可能存在内容错误、夹带隐私敏感信息、无效垃圾内容等问题。若不经审核直接入库，脏数据会污染知识库，直接导致 AI 问答输出错误、不合规回复。

因此所有文档必须经管理员审核通过后，才可正式纳入知识检索体系。

基于审核机制，文档设计 4 种生命周期状态：

- 草稿：上传完成、未提交审核，仅上传人可见
- 待审核：用户提交发布申请，等待管理员处理
- 已发布：审核通过，全权限用户可检索调用
- 已驳回：审核不通过，附带驳回原因，支持修改后重新提审

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfddDqtUMCbjrPJK4sdz6kOdHZINv4HQuyD8POvicnicTJiaZZaZNLf86r0hrWicDu34EZa022T5e75jHmgO9A4l9kD8k2ia7CiahibDFk/640?wx_fmt=webp&from=appmsg#imgIndex=1)

所有上传的文件，都会转为 markdown 格式。

原始二进制文件（PDF / 视频 / 音频等大体积源文件）：持久存储至 RustFS 对象存储；

文档元数据（标题、上传人、创建时间、审核状态、分类、关联 ID 等轻量信息）：存入 PostgreSQL 关系库；

解析后的完整 Markdown 正文：独立存储于 MongoDB。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwff7s8JCUS7yl48VKeibu5ofKdbibqiatdOWibntIQ5qHRuaaO8pHLd0EL8gf04Y0d39bvP6mfI5yWWFZsDZia53BYLOhV2lDe93FgBo/640?wx_fmt=png&from=appmsg)

审核通过后，文档成为发布状态，才会做文本切分 Chunk、抽取实体存入 Neo4j 知识图谱、构建 ES 全文索引、生成向量写入向量库。

我们创建下后端项目：

```
nest new knowledge-hub-backend
```

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcY7ENXQlQEOBiahhJ3uKZySPPUxNTORk8cXV32MmBZ36rWcyftwd4H7x8NEiaZZ6Tuy3PtYc2ox7I3giaiciaR4sj8S3OjibxUIAibEo/640?wx_fmt=webp&from=appmsg#imgIndex=3)

我们先准备一下 docker-compose.yml

（你可以直接从仓库复制）

```
services:
  # PostgreSQL
postgres:
      image:pgvector/pgvector:pg16
      container_name:knowledge_hub_postgres
      restart:always
      environment:
        POSTGRES_USER:user
        POSTGRES_PASSWORD:123456
        POSTGRES_DB:knowledge_hub
      ports:
        -"5432:5432"
      volumes:
        -${DOCKER_VOLUME_DIRECTORY:-.}/volumes/postgres:/var/lib/postgresql/data
        -./init-scripts/postgresql:/docker-entrypoint-initdb.d
      healthcheck:
        test:["CMD-SHELL","pg_isready -U user -d hello_pg"]
        interval:5s
        timeout:5s
        retries:5

# PostgreSQL GUI (pgAdmin)
pgadmin:
    container_name:knowledge_hub_pgadmin
    image:dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL:admin@admin.com
      PGADMIN_DEFAULT_PASSWORD:admin
    volumes:
      -${DOCKER_VOLUME_DIRECTORY:-.}/volumes/pgadmin:/var/lib/pgadmin
    healthcheck:
      test:["CMD","curl","-f","http://localhost:80/login"]
      interval:30s
      timeout:20s
      retries:3
    ports:
      -"8088:80"
    depends_on:
      -postgres

# MongoDB 主库
mongodb:
    image:mongo:7-jammy
    container_name:knowledge_hub_mongodb
    restart:always
    environment:
      MONGO_INITDB_ROOT_USERNAME:mongo_user
      MONGO_INITDB_ROOT_PASSWORD:mongo_pass123
      MONGO_INITDB_DATABASE:knowledge_hub
    ports:
      -"27017:27017"
    volumes:
      -${DOCKER_VOLUME_DIRECTORY:-.}/volumes/mongo:/data/db
      -./init-scripts/mongodb:/docker-entrypoint-initdb.d
    healthcheck:
      test:["CMD","mongosh","--eval","db.adminCommand('ping')","-u","mongo_user","-p","mongo_pass123","--authenticationDatabase","admin"]
      interval:10s
      timeout:10s
      retries:5

# MongoDB Web GUI: mongo-express
mongo-express:
    image:mongo-express:1.0.2-20-alpine3.19
    container_name:knowledge_hub_mongo_express
    restart:always
    ports:
      -"8081:8081"
    environment:
      # 连接 mongo 数据库账号（和mongodb服务保持一致）
      ME_CONFIG_MONGODB_SERVER:mongodb
      ME_CONFIG_MONGODB_ADMINUSERNAME:mongo_user
      ME_CONFIG_MONGODB_ADMINPASSWORD:mongo_pass123
      ME_CONFIG_MONGODB_ENABLE_ADMIN:"true"
      # mongo-express 网页登录账号（区分数据库账号）
      ME_CONFIG_BASICAUTH_ENABLED:"true"
      ME_CONFIG_BASICAUTH_USERNAME:me_admin
      ME_CONFIG_BASICAUTH_PASSWORD:me_123456
      # 编辑器暗色主题
      ME_CONFIG_OPTIONS_EDITORTHEME:"3024-night"
    # 等待mongodb健康就绪再启动
    depends_on:
      mongodb:
        condition:service_healthy

networks:
default:
    name:common-network
```

用到的 mongodb 的初始化脚本：

```
db = db.getSiblingDB("knowledge_hub");

db.createUser({
  user: "knowledge_hub_user",
  pwd: "knowledge_hub_password",
  roles: [{ role: "readWrite", db: "knowledge_hub" }],
});

db.createCollection("kh_document");
db.createCollection("kh_chunk");
```

跑一下：

**🎬 [视频 1](http://mpvideo.qpic.cn/0bc3hea6uaabfiaerlswfnvfcood5i4qd2qa.f10002.mp4?dis_k=62ca7a9629923c60f264dd80d82ffb89&dis_t=1786439494&play_scene=10110&auth_info=Q57UmvhBVKXh7Kd3Qr/77JVyDx46FmdiaBNlNx40UQ5/IERaS2t1bVguJjw1FnUwPx4CPi4c&auth_key=c9c97cf28a16f0da445cf4842b9fb4f7)**

![视频1](assets/45_video_1.gif)

PostgreSql 和 MongoDB 都跑起来了

接下来我们设计下表结构：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfc1BqkwaIcwYkpEHUK2NrKFlw7yOCUytfibiaMW3DSwoSey8Boia2nHoFZVnXGdKTA6pjRzgALKYibzfR2PEttYn2UjppTU9u1tnWU/640?wx_fmt=png&from=appmsg)

PostgreSQL 存 kh_document 文档元数据

标题、分类、团队、作者、统计数据、状态、权限、版本等。

MongoDB 存 document_content 文档正文

两者通过 content_id 一一绑定

分开存有啥好处呢？

冷热数据分开，刷文档列表只查 PG，速度很快

只有点开详情，才去 Mongo 拉 Markdown 正文

充分利用两个库各自长处：

PG 管筛选、分页、权限、统计，承载全部结构化业务数据

Mongo 专门放长文本，不会拖累列表查询性能

两边读写压力互不干扰，负载隔离

有同学可能会问，MongoDB 单个文档存储上限是 16M，那超了咋办呢？

其实不会的，因为我们会把图片外置，存到 oss，只保留图片链接

纯文字文档很难触达上限，500 万汉字才会占满 16MB

一本完整《红楼梦》也才 70 万字

普通企业技术文档大多几十万字以内，完全不用担心超限

所以这个问题不用担心，在企业级知识库这个场景遇不到

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfe9pFnia38P7aGppHeLWicVf8fMaGViasokibfiawoS3evs5K5VR2ASvekDicP51XGJBMHucic1zgylMiazMIIYSbHt7dicRoou7LXCibSick/640?wx_fmt=webp&from=appmsg#imgIndex=5)

按照这个设计我们来写一下初始化 sql

```
-- 文档元数据表
CREATETABLEIFNOTEXISTS kh_document (
    idBIGINT PRIMARY KEY,
    title VARCHARNOTNULL,
    content_id VARCHARNOTNULLUNIQUE,
    summary VARCHAR,
    category_id BIGINT,
    team_id BIGINT,
    author_id BIGINT,
    cover_image VARCHAR,
    tags VARCHAR,
    statusSMALLINTNOTNULLDEFAULT0,
    remark VARCHAR,
    view_count INTNOTNULLDEFAULT0,
    like_count INTNOTNULLDEFAULT0,
    comment_count INTNOTNULLDEFAULT0,
    favourite_count INTNOTNULLDEFAULT0,
    word_count INTNOTNULLDEFAULT0,
    publish_time TIMESTAMP,
    is_public BOOLEANNOTNULLDEFAULTfalse,
    created_at TIMESTAMPNOTNULLDEFAULTNOW(),
    updated_at TIMESTAMPNOTNULLDEFAULTNOW(),
    create_by BIGINT,
    update_by BIGINT,
    deleted BOOLEANNOTNULLDEFAULTfalse
);
```

重新跑一下 docker compose：

**🎬 [视频 2](http://mpvideo.qpic.cn/0b2ehiacyaaaliai5jkxpfvfaowdfq5aalaa.f10002.mp4?dis_k=5919fa2014f49976de2a0bca55a56695&dis_t=1786439494&play_scene=10110&auth_info=SLuO0eJCXv/g6qUgRuqv6s4jXhNpRTc2aR9mPExsAA50JkdXFG1/N1koJGsxQyE2ZE9TM31P&auth_key=ce3c82b01dd6ee4302c835c78e4f1de6)**

![视频2](assets/45_video_2.gif)

然后我们在代码里连接数据库，做一下从接口到写入数据库的流程。

创建一个模块：

```
nest g res document --no-spec
```

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfch8r94w4mt7yiaricuvyhm5PHeqDO6z01wCD7CkHNXdN1ibkmYgchPN7nXjiaLX9cG69EXibUoZNrzzVLibBVwLZTUjHxfGqqDib6SLY/640?wx_fmt=webp&from=appmsg#imgIndex=6)

安装下依赖：

```
pnpm add @nestjs/typeorm typeorm pg @nestjs/mongoose mongoose @nestjs/config class-validator class-transformer snowflake-id

pnpm add -D @types/pg
```

（微信最近不支持复制了，你可以截图让豆包提取文字，代码直接仓库复制）

安装 typeorm、mongoose 依赖，分别用来连接两个数据库

写一下具体的 CRUD 代码：

**🎬 [视频 3](http://mpvideo.qpic.cn/0bc3hma76aab6aaf3aswnfvfco6d745qd7ya.f10002.mp4?dis_k=84c0e26fc15bc3b03bbef48390855121&dis_t=1786439494&play_scene=10110&auth_info=TPjl/Y4TBPW17PInFu75vJVxUhYwRTQxYhtrMR5lA11wcBVSRzslPQwuc2xhR3dgPx1fNiRP&auth_key=26bfdc193f8ae18ccfc20f7a13974172)**

![视频3](assets/45_video_3.gif)

这样我们就完成了代码里连接 MongoDB、PostgreSQL 并实现了文档的 CRUD 接口。

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

> 项目的代码会按照每节加 01、02、03 的后缀，不用担心代码和章节内容对不上，比如这节代码就是 knowledge_hub_01

## 总结

这节我们梳理了模块完整业务设计，包含文档状态流转、发布审核机制，确定了 PostgreSQL+MongoDB 分层存储方案：

存储分层：

PostgreSQL kh_document 表存储文档业务元数据，MongoDB document_content 集合单独存放 Markdown 正文，通过content_id一一关联；

工程初始化：

搭建 NestJS 后端项目，编写 Docker Compose 部署配置、PG/Mongo 初始化脚本，容器启动自动完成建表、建集合与索引；

数据交互：

基于@nestjs/typeorm、@nestjs/mongoose分别实现双库实体映射，完成文档全量 CRUD 接口开发；

完整实现文档从前端接口接收、业务处理到双库分层持久化的全流程闭环。
