import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

/**
 * 通用S3文件上传（RustFS/MinIO/阿里云OSS通用）
 */
// 初始化统一S3客户端（RustFS/MinIO/阿里云OSS通用）
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  signatureVersion: 'v4',
  region: 'aaa' // 本地私有存储随便填，不影响
});

/**
 * 文件流上传
 * @param {string} objectKey 对象路径 aaa/bbb/first.png
 * @param {ReadableStream} stream fs可读流
 * @param {string} contentType 文件类型（图片/pdf等）
 */
async function putStream(objectKey, stream, contentType = 'image/png') {
  try {
    const uploadCmd = new PutObjectCommand({
      Bucket: 'hello',
      Key: objectKey,
      Body: stream,
      ContentType: contentType
    });
    await s3Client.send(uploadCmd);
    console.log('上传成功');
  } catch (err) {
    console.error('上传失败', err);
    throw err;
  }
}

async function main() {
  const stream = fs.createReadStream('./zao.png');
  await putStream('aaa/bbb/first.png', stream, 'image/png');
}

main();
