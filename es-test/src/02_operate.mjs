import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200'
});

const INDEX_NAME = 'travel_journal';

async function createDocument() {
  const now = new Date().toISOString();
  // client.index() 方法用于向指定索引中插入单条文档，document 参数是要插入的文档内容，refresh: true 表示立即刷新索引，使新文档可被搜索到
  const res = await client.index({
    index: INDEX_NAME,
    document: {
      note_title: '夜跑复盘',
      note_body: '今天夜跑 5 公里，配速稳定，结束后做了拉伸。',
      tags: ['运动', '夜跑'],
      mood: 'focused',
      priority: 2,
      created_at: now,
      updated_at: now
    },
    refresh: true
  });

  console.log('✅ 新增成功，ID =', res._id);
  return res._id;
}

async function getDocument(docId) {
  // client.get() 方法用于根据文档 ID 查询指定索引中的文档，res._source 是查询结果的文档内容
  const res = await client.get({
    index: INDEX_NAME,
    id: docId
  });
  console.log('📖 查询结果:', res._source);
}

async function updateDocument(docId) {
  // client.update() 方法用于根据文档 ID 更新指定索引中的文档，doc 参数是要更新的字段内容，refresh: true 表示立即刷新索引，使更新后的文档可被搜索到
  await client.update({
    index: INDEX_NAME,
    id: docId,
    doc: {
      note_body: '今天夜跑 6 公里，状态不错，拉伸后恢复很快。',
      tags: ['运动', '夜跑', '训练'],
      updated_at: new Date().toISOString()
    },
    refresh: true
  });
  console.log('🔄 更新成功');
}

async function searchDocuments() {
  // client.search() 方法用于在指定索引中搜索文档，query 参数是搜索条件，这里使用 match 查询 note_body 字段，使用 ik_smart 分词器进行中文分词
  const res = await client.search({
    index: INDEX_NAME,
    query: {
      match: {
        note_body: {
          query: '慢跑以及骑行的数据',
          analyzer: 'ik_smart'
        }
      }
    }
  });

  const rows = res.hits.hits.map((item) => ({
    id: item._id,
    ...item._source
  }));
  console.log('🔍 搜索结果:', rows);
}

async function deleteDocument(docId) {
  // client.delete() 方法用于根据文档 ID 删除指定索引中的文档，refresh: true 表示立即刷新索引，使删除后的文档不可被搜索到
  await client.delete({
    index: INDEX_NAME,
    id: docId,
    refresh: true
  });
  console.log('🗑️ 删除成功');
}

async function run() {
  // const docId = await createDocument();
  // await getDocument(docId);
  // console.log('docId', docId);
  const docId = 'kghrt58Bq0Ys65AnVjij';
  // await updateDocument(docId);
  // await getDocument(docId);
  await searchDocuments();

  // await deleteDocument(docId);
}

run().catch((err) => {
  console.error('❌ 操作阶段失败:', err);
  process.exit(1);
});
