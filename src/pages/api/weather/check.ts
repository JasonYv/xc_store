import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

// 心知天气 API 配置
const SENIVERSE_API_KEY = process.env.SENIVERSE_API_KEY || 'SWPDcElJ0P5nW8DOI';
const SENIVERSE_API_URL = 'https://api.seniverse.com/v3/weather';
// 乌鲁木齐（含沙依巴克区）
const LOCATION = 'wulumuqi';

// 企业微信机器人 Webhook
const WECOM_WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=29e819b2-8e68-4c6c-a303-6d3c8c65a3ad';

// 降雨关键词
const RAIN_KEYWORDS = ['雨', '雪', '冰雹', '雨夹雪', '冻雨', '暴雨', '阵雨', '雷阵雨', '小雨', '中雨', '大雨'];
// 大风阈值（风力等级 >= 此值视为大风）
const WIND_SCALE_THRESHOLD = 4;

interface SeniverseDaily {
  date: string;
  text_day: string;
  text_night: string;
  high: string;
  low: string;
  wind_direction: string;
  wind_direction_degree: string;
  wind_speed: string;
  wind_scale: string;
  humidity: string;
  precip: string;
  rainfall: string;
}

interface SeniverseResponse {
  results: Array<{
    location: {
      id: string;
      name: string;
      country: string;
      path: string;
      timezone: string;
    };
    daily: SeniverseDaily[];
    last_update: string;
  }>;
}

// 判断天气文字是否包含降雨
function hasRain(text: string): boolean {
  return RAIN_KEYWORDS.some(keyword => text.includes(keyword));
}

// 判断风力是否达到大风级别
function hasStrongWind(windScale: string): boolean {
  const scale = parseInt(windScale, 10);
  return !isNaN(scale) && scale >= WIND_SCALE_THRESHOLD;
}

// 风力等级描述
function getWindDescription(scale: string): string {
  const s = parseInt(scale, 10);
  if (s <= 2) return '微风';
  if (s === 3) return '3级风';
  if (s === 4) return '4级风';
  if (s === 5) return '5级风';
  if (s === 6) return '6级风';
  if (s >= 7) return `${s}级大风`;
  return `${scale}级风`;
}

// 构建企业微信 Markdown 天气卡片
function buildWeatherMarkdown(daily: SeniverseDaily[], locationName: string, alerts: string[]): string {
  const today = daily[0];
  const tomorrow = daily[1];

  let content = `## 天气预警提醒\n`;
  content += `> 地区：<font color="info">${locationName}</font>\n`;
  content += `> 更新时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Urumqi' })}\n\n`;

  // 预警信息
  content += `### ⚠️ 预警内容\n`;
  alerts.forEach(alert => {
    content += `> <font color="warning">${alert}</font>\n`;
  });

  // 今日天气
  content += `\n### 📅 今日天气（${today.date}）\n`;
  content += `> 白天：**${today.text_day}** / 夜间：**${today.text_night}**\n`;
  content += `> 温度：${today.low}°C ~ ${today.high}°C\n`;
  content += `> 风向：${today.wind_direction} ${getWindDescription(today.wind_scale)}\n`;
  content += `> 湿度：${today.humidity}%\n`;

  // 明日天气
  if (tomorrow) {
    content += `\n### 📅 明日天气（${tomorrow.date}）\n`;
    content += `> 白天：**${tomorrow.text_day}** / 夜间：**${tomorrow.text_night}**\n`;
    content += `> 温度：${tomorrow.low}°C ~ ${tomorrow.high}°C\n`;
    content += `> 风向：${tomorrow.wind_direction} ${getWindDescription(tomorrow.wind_scale)}\n`;
    content += `> 湿度：${tomorrow.humidity}%\n`;
  }

  return content;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '仅支持 GET/POST 请求' });
  }

  // API Key 鉴权
  await db.init();
  const requestApiKey = req.headers['x-api-key'] || req.query.key;
  const systemApiKey = await db.getSetting('apiKey');

  if (!requestApiKey || !systemApiKey || requestApiKey !== systemApiKey) {
    return res.status(401).json({
      success: false,
      message: '未授权访问，请提供有效的 API Key（通过 x-api-key 请求头或 key 查询参数）'
    });
  }

  // 支持通过请求参数覆盖默认配置
  const apiKey = (req.query.weatherKey as string) || SENIVERSE_API_KEY;
  const location = (req.query.location as string) || LOCATION;
  // 是否强制发送（不管有没有预警都发送）
  const forceSend = req.query.force === 'true';

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: '缺少心知天气 API Key，请设置环境变量 SENIVERSE_API_KEY 或通过 weatherKey 参数传入'
    });
  }

  try {
    // 1. 获取未来3天天气预报
    const weatherUrl = `${SENIVERSE_API_URL}/daily.json?key=${apiKey}&location=${location}&language=zh-Hans&unit=c&start=0&days=3&t=${Date.now()}`;
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      return res.status(weatherResponse.status).json({
        success: false,
        message: '获取天气数据失败',
        error: errorText
      });
    }

    const weatherData: SeniverseResponse = await weatherResponse.json();

    if (!weatherData.results || weatherData.results.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该地区的天气数据'
      });
    }

    const result = weatherData.results[0];
    const daily = result.daily;
    const locationName = result.location.path || result.location.name;

    // 2. 分析未来1天（今天+明天）的降雨和刮风情况
    const alerts: string[] = [];
    const daysToCheck = daily.slice(0, 2); // 今天和明天

    daysToCheck.forEach(day => {
      const dateLabel = day.date === daily[0].date ? '今日' : '明日';

      // 检查降雨
      if (hasRain(day.text_day)) {
        alerts.push(`${dateLabel}（${day.date}）白天有${day.text_day}`);
      }
      if (hasRain(day.text_night)) {
        alerts.push(`${dateLabel}（${day.date}）夜间有${day.text_night}`);
      }

      // 检查大风
      if (hasStrongWind(day.wind_scale)) {
        alerts.push(`${dateLabel}（${day.date}）${day.wind_direction}风${getWindDescription(day.wind_scale)}（风速${day.wind_speed}km/h）`);
      }
    });

    // 3. 如果有预警或强制发送，推送企业微信
    const shouldSend = alerts.length > 0 || forceSend;

    if (shouldSend) {
      const markdownContent = buildWeatherMarkdown(daily, locationName, alerts.length > 0 ? alerts : ['当前无降雨和大风预警']);

      const webhookPayload = {
        msgtype: 'markdown',
        markdown: {
          content: markdownContent
        }
      };

      const webhookResponse = await fetch(`${WECOM_WEBHOOK_URL}&t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      const webhookResult = await webhookResponse.json();

      if (webhookResult.errcode !== 0) {
        return res.status(500).json({
          success: false,
          message: '推送企业微信失败',
          error: webhookResult,
          weatherData: { location: locationName, daily: daysToCheck, alerts }
        });
      }

      return res.status(200).json({
        success: true,
        message: alerts.length > 0 ? '检测到天气预警，已推送企业微信' : '强制推送天气信息成功',
        data: {
          location: locationName,
          alerts,
          daily: daysToCheck,
          webhookResult
        }
      });
    }

    // 无预警，不推送
    return res.status(200).json({
      success: true,
      message: '未来24小时内无降雨和大风预警，无需推送',
      data: {
        location: locationName,
        alerts: [],
        daily: daysToCheck
      }
    });

  } catch (error) {
    console.error('天气检查失败:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
