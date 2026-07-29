/** 假接口：演示 supervisor 如何把问题分给不同子代理 */

function normCity(city) {
  return String(city).trim();
}

const weatherTable = {
  杭州: { summary: "多云转小雨", tempHighC: 22, tempLowC: 15, aqi: "良" },
  北京: { summary: "晴", tempHighC: 26, tempLowC: 12, aqi: "轻度污染" },
  上海: { summary: "阴", tempHighC: 20, tempLowC: 16, aqi: "良" },
};

const triviaTable = {
  杭州: "西湖文化景观是世界文化遗产之一。",
  北京: "故宫是世界上现存规模最大的古代宫殿建筑群之一。",
  上海: "外滩万国建筑博览群是近代城市历史的缩影。",
};

/** 查某地当日天气摘要（模拟） */
export function lookupWeather(city) {
  const c = normCity(city);
  const w = weatherTable[c];
  if (!w) {
    return JSON.stringify({
      city: c,
      summary: "暂无该城市数据，以下为占位",
      tempHighC: 20,
      tempLowC: 12,
      aqi: "—",
    });
  }
  return JSON.stringify({ city: c, ...w });
}

/** 查询某城市相关的一句小知识（模拟） */
export function lookupCityTrivia(city) {
  const c = normCity(city);
  const line = triviaTable[c];
  return JSON.stringify({
    city: c,
    trivia: line ?? `没有为「${c}」准备内置小知识，可换杭州/北京/上海试试。`,
  });
}
