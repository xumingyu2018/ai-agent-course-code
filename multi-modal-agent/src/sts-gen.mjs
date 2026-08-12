import 'dotenv/config';
import OSS from 'ali-oss';

/**
 * 阿里云OSS上传签名生成，用于Web端使用临时访问凭证可以直接上传文件到OSS
 * 参考文档：https://help.aliyun.com/zh/oss/user-guide/uploading-objects-to-oss-directly-from-clients/
 */
async function main() {

    const config = {
        region: 'oss-cn-shanghai',
        bucket: 'agent-bucket-xmy',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    }

    const client = new OSS(config);

    // 配置 Bucket 跨域规则，否则浏览器直传会被 CORS 拦截。
    // 只需执行一次，重复执行会覆盖已有规则。
    await client.putBucketCORS(config.bucket, [{
        allowedOrigin: '*',
        allowedMethod: ['POST', 'GET', 'PUT', 'HEAD'],
        allowedHeader: '*',
        exposeHeader: ['ETag', 'x-oss-request-id'],
        maxAgeSeconds: 0,
    }]);

    const date = new Date();
    
    date.setDate(date.getDate() + 1);
    
    // calculatePostSignature 用于计算上传签名，返回一个包含签名信息的对象。
    const res = client.calculatePostSignature({
        expiration: date.toISOString(), // 设置上传策略的过期时间，ISO 8601格式。
        conditions: [
            ["content-length-range", 0, 1048576000], //设置上传文件的大小限制。      
        ]
    });
    
    console.log(res);
    
    // 获取Bucket的 url
    const location = await client.getBucketLocation();
    
    const host = `http://${config.bucket}.${location.location}.aliyuncs.com`;

    console.log(host);
}

main();