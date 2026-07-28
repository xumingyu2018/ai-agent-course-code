import "dotenv/config";
import tencentcloud from "tencentcloud-sdk-nodejs";
import fs from "node:fs";

const SECRET_ID = process.env.SECRET_ID;
const SECRET_KEY = process.env.SECRET_KEY;

// 调用腾讯云 ASR 服务 SDK，将音频文件转换为文本
const AsrClient = tencentcloud.asr.v20190614.Client;
const AUDIO_FILE = './output3.mp3';

const client = new AsrClient({
  credential: {
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
  },
  region: "ap-shanghai",
  profile: {
    httpProfile: {
      reqMethod: "POST",
      reqTimeout: 30,
    },
  },
});

async function run() {
  const audioBase64 = fs.readFileSync(AUDIO_FILE).toString("base64");

  const params = {
    EngSerViceType: "16k_zh", // 16k_zh：中文普通话，16k_en：英文，8k_zh：电话 8k 中文普通话
    SourceType: 1, // 1：音频数据（base64 编码），2：音频 URL
    Data: audioBase64, // 音频数据（base64 编码）
    DataLen: Buffer.byteLength(audioBase64), // 音频数据长度（字节数）
    VoiceFormat: "mp3", // 音频格式，支持 wav、mp3、pcm 等
  };

  try {
    // SentenceRecognition 接口用于识别音频文件中的语音内容，返回识别结果
    const data = await client.SentenceRecognition(params);
    console.log("识别结果：", data.Result);
  } catch (err) {
    console.error("识别失败：", err);
  }
}

run();