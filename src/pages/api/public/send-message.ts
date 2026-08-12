import { NextApiRequest, NextApiResponse } from 'next';
import { API_CONFIG } from '@/config/api';
import db from '@/lib/sqlite-db';
import { Merchant } from '@/lib/types';

// 定义消息模板
const MESSAGE_TEMPLATES = {
    A: `🔊 炫朝云仓通知：️
👉 您好，请在 7:30 之前发送今日派单数据，销量截图或者文字信息，明确告知我云仓当前销量情况(包含：订单预估、当前销量、)!
🚩 超时未发放，当日罚款云仓不承担；超过 8:00 视为严重迟到，云合加收 100 元/趟派车费，同时产生罚款云仓不承担！
🤝 智能客服群发,如无排期请忽略! 🤝`,

    B: `🔊 炫朝云仓通知：️️
👉 您好,目前已经基本入完库了,请检查今日入库情况，如有未入库产品请及时告知我云仓,谢谢相互合作!
🚩 不足八点预估100%及时反馈,否则产生罚款,我方不承担!`,

    C: `🔊 炫朝云仓通知：️️
👉 您好,晚上8点预补一次货，请检查一下当前销量，有需要补货的请发截图或者文字信息，明确告知我云仓当前销量情况(包含：订单预估、当前销量、)！
🚩 超期发放或不发会造成您的履约罚款！`,

    D: `👉 您好,夜间补货，有需要补货的请在 23:10 之前发截图或者文字信息，明确告知我云仓当前销量情况(包含：订单预估、当前销量、)!
🚩 超时未发放可能会产品迟到罚款，云仓不承担；超过 23:15 视为严重迟到，加收 100 元/趟派车费，同时产生罚款云仓不承担！
🚩🚩 重要：补货完一定要检查并发截单截图！！！`
} as const;

type MessageType = keyof typeof MESSAGE_TEMPLATES;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 同时支持 GET 和 POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 初始化数据库连接
        await db.init();
        await db.migrateFromJson();

        // 验证API Key - 从数据库读取系统设置中的 API Key
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        const systemApiKey = await db.getSetting('apiKey');

        if (!apiKey || !systemApiKey || apiKey !== systemApiKey) {
            return res.status(401).json({
                success: false,
                error: '无效的API密钥',
                message: 'API Key 无效'
            });
        }

        // 获取消息类型
        const messageType = (req.method === 'GET'
            ? req.query.type?.toString()
            : req.body.type) as MessageType;

        if (!messageType || !MESSAGE_TEMPLATES[messageType]) {
            return res.status(400).json({
                error: 'Invalid message type. Must be one of: A, B, C, D'
            });
        }

        // 读取商家数据
        const merchants = await db.getAllMerchants();  // 从SQLite获取所有商家
        
        // 过滤需要发送消息的商家
        const merchantsToSend = merchants.filter((merchant: Merchant) => 
            merchant.sendMessage && merchant.groupName
        );

        if (merchantsToSend.length === 0) {
            return res.status(200).json({
                success: true,
                message: '没有需要发送消息的商家'
            });
        }

        // 构建消息列表
        // 如果有 atList，在消息前添加换行，实现 @人名换行后发送消息内容
        const messageList = merchantsToSend.map((merchant: Merchant) => {
            const hasAtList = merchant.mentionList && merchant.mentionList.length > 0;
            return {
                type: 203,
                titleList: [merchant.groupName],
                receivedContent: hasAtList
                    ? `\n${MESSAGE_TEMPLATES[messageType]}`
                    : MESSAGE_TEMPLATES[messageType],
                atList: hasAtList ? merchant.mentionList : []
            };
        });

        // 构建请求数据
        const requestData = {
            socketType: 2,
            list: messageList
        };

        // 发送HTTP请求
        const response = await fetch(
            `${API_CONFIG.SEND_MESSAGE_URL}?robotId=${API_CONFIG.ROBOT_ID}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        const results = merchantsToSend.map((merchant: Merchant) => ({
            merchantId: merchant.id,
            groupName: merchant.groupName,
            atList: merchant.mentionList || [],
            status: 'success',
            message: `消息已发送到群组: ${merchant.groupName}${
                merchant.mentionList && merchant.mentionList.length > 0
                    ? ` (@ ${merchant.mentionList.join(', ')})`
                    : ''
            }`
        }));

        return res.status(200).json({
            success: true,
            data: {
                messageType,
                totalMerchants: merchantsToSend.length,
                messagesSent: messageList.length,
                result,
                results
            }
        });

    } catch (error) {
        console.error('发送消息时出错:', error);
        return res.status(500).json({
            success: false,
            error: '发送消息失败',
            message: error instanceof Error ? error.message : '未知错误'
        });
    }
} 