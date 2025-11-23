# 发送订单截图 API 文档

## 接口信息

- **路径**: `/api/v3/send-order-screenshot`
- **方法**: `POST`
- **Content-Type**: `multipart/form-data`
- **描述**: 上传商家订单截图并自动发送到对应的企业微信群

## 请求参数

### Form Data 参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| merchantId | string | 是 | 商家ID |
| screenshot | file | 是 | 订单截图文件 (支持图片格式,最大10MB) |

## 请求示例

### cURL

```bash
curl -X POST http://localhost:3001/api/v3/send-order-screenshot \
  -F "merchantId=1234567890-abc123" \
  -F "screenshot=@/path/to/order-screenshot.png"
```

### JavaScript (Fetch)

```javascript
const formData = new FormData();
formData.append('merchantId', '1234567890-abc123');
formData.append('screenshot', fileInput.files[0]);

fetch('http://localhost:3001/api/v3/send-order-screenshot', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import requests

url = 'http://localhost:3001/api/v3/send-order-screenshot'

files = {
    'screenshot': open('order-screenshot.png', 'rb')
}
data = {
    'merchantId': '1234567890-abc123'
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

### Postman

1. 选择 **POST** 方法
2. 输入 URL: `http://localhost:3001/api/v3/send-order-screenshot`
3. 选择 **Body** → **form-data**
4. 添加参数:
   - `merchantId`: `1234567890-abc123` (Text)
   - `screenshot`: 选择文件 (File)
5. 点击 **Send**

## 响应格式

### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "订单截图已成功发送",
  "data": {
    "merchantId": "1234567890-abc123",
    "merchantName": "测试商家",
    "groupName": "测试云仓群",
    "imageUrl": "http://localhost:3001/uploads/order-screenshots/1234567890-screenshot.png",
    "fileName": "1234567890-screenshot.png",
    "robotResponse": {
      "code": 200,
      "message": "success",
      "data": "..."
    }
  }
}
```

### 错误响应

#### 缺少参数 (400 Bad Request)

```json
{
  "success": false,
  "message": "缺少商家ID参数"
}
```

```json
{
  "success": false,
  "message": "缺少截图文件"
}
```

#### 商家不存在 (404 Not Found)

```json
{
  "success": false,
  "message": "商家不存在"
}
```

#### 商家未启用功能 (400 Bad Request)

```json
{
  "success": false,
  "message": "该商家未启用发送订单截图功能"
}
```

#### 发送失败 (500 Internal Server Error)

```json
{
  "success": false,
  "message": "发送消息到企业微信失败",
  "error": "具体错误信息",
  "imageUrl": "http://localhost:3001/uploads/order-screenshots/1234567890-screenshot.png"
}
```

## 业务流程

1. **上传文件**: 接收订单截图文件并保存到 `public/uploads/order-screenshots/` 目录
2. **验证商家**: 根据 `merchantId` 查询商家信息
3. **检查权限**: 验证商家是否启用了 `sendOrderScreenshot` 功能
4. **生成URL**: 生成可公网访问的图片URL
5. **发送消息**: 调用 WorkTool 机器人API,将图片发送到商家对应的企业微信群
6. **返回结果**: 返回发送状态和图片信息

## 前置条件

1. **商家配置**:
   - 商家必须存在于系统中
   - 商家的 `sendOrderScreenshot` 字段必须为 `true`
   - 商家必须配置了 `groupName` (企业微信群名称)

2. **环境配置**:
   - 在 `.env` 文件中配置 `BASE_URL` (生产环境必须配置为公网可访问的域名)
   - 确保 `public/uploads/order-screenshots/` 目录存在且可写

3. **WorkTool 机器人**:
   - 机器人ID: `wtr89taerr32z8miwin31fabnzdkzn83`
   - API地址: `https://api.worktool.ymdyes.cn/wework/sendRawMessage`
   - 机器人必须在对应的企业微信群中

## 注意事项

1. **文件大小限制**: 单个文件最大 10MB
2. **文件格式**: 支持常见图片格式 (jpg, png, gif等),不支持 webp
3. **文件名**: 自动生成唯一文件名格式: `时间戳-原文件名.扩展名`
4. **图片URL**:
   - 本地开发: `http://localhost:3001/uploads/order-screenshots/xxx.png`
   - 生产环境: `https://yourdomain.com/uploads/order-screenshots/xxx.png`
5. **清理策略**: 上传的文件不会自动删除,需要定期手动清理或配置定时任务
6. **网络要求**: 图片URL必须能从企业微信服务器访问到,本地开发环境可能无法正常发送

## 环境变量配置

在 `.env` 或 `.env.local` 文件中配置:

```bash
# 基础URL (必须是公网可访问的域名)
BASE_URL=https://yourdomain.com

# 服务器端口
PORT=3001
```

## 错误排查

### 1. 图片无法发送到企业微信群

**可能原因**:
- 图片URL无法从公网访问
- 机器人不在该企业微信群中
- 群名称(`groupName`)配置错误

**解决方案**:
- 检查 `BASE_URL` 配置是否正确
- 确认机器人已加入目标群聊
- 核对商家的 `groupName` 是否与企业微信群名称一致

### 2. 上传文件失败

**可能原因**:
- 文件大小超过限制
- 目录权限不足
- 磁盘空间不足

**解决方案**:
- 检查文件大小是否超过10MB
- 确保 `public/uploads/order-screenshots/` 目录存在且可写
- 检查服务器磁盘空间

### 3. 商家不存在或未启用功能

**解决方案**:
- 在商家管理页面检查商家是否存在
- 确认商家的"发送订单截图"开关已启用

## 相关接口

- `GET /api/merchants` - 获取商家列表
- `PUT /api/merchants?id=xxx` - 更新商家配置 (启用/禁用发送订单截图)
- `GET /api/public/merchants/list` - 获取商家凭证列表(包含 `sendOrderScreenshot` 字段)
