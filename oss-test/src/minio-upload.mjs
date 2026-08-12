import 'dotenv/config';
import fs from 'fs';
import * as Minio from 'minio';

/**
 * 本地Minio文件上传
 */
const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
})

async function putStream() {
    try {
        const stream = fs.createReadStream('./zao.png');
        // minioClient.putObject 方法的作用是将文件流上传到Minio服务器指定的bucket和路径
        const result = await minioClient.putObject('aaa', 'ccc/ddd/hello.png', stream);
        console.log(result);
        console.log('上传成功');
    } catch (err) {
        console.log(err);
    }
}

putStream();

