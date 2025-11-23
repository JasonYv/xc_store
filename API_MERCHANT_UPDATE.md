# 商家信息更新 API 文档

## 接口概述

此接口用于更新商家的拼多多相关信息，包括拼多多店铺ID和店铺名称。

- **接口地址**: `/api/v3/merchant/update`
- **请求方法**: `POST`
- **认证方式**: API Key (通过 Header 或 Query 参数)
- **Content-Type**: `application/json`

## 认证

### 方式 1: HTTP Header（推荐）

```
X-API-Key: your_api_key_here
```

### 方式 2: URL Query 参数

```
/api/v3/merchant/update?apiKey=your_api_key_here
```

## 请求参数

### Body 参数 (JSON)

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| merchantId | string | 是 | 商家ID |
| pinduoduoShopId | string | 否 | 拼多多买菜店铺ID |
| pinduoduoName | string | 否 | 拼多多买菜店铺名称 |

**注意**: `pinduoduoShopId` 和 `pinduoduoName` 至少需要提供一个。

## 响应格式

### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "商家信息更新成功",
  "data": {
    "id": "1737513940280",
    "name": "炫朝供应链",
    "pinduoduoShopId": "123456789",
    "pinduoduoName": "炫朝生鲜"
  }
}
```

### 错误响应

#### 401 - API Key 无效

```json
{
  "success": false,
  "message": "API Key 无效"
}
```

#### 400 - 缺少必填参数

```json
{
  "success": false,
  "message": "缺少商家ID参数 (merchantId)"
}
```

#### 400 - 没有需要更新的字段

```json
{
  "success": false,
  "message": "没有需要更新的字段 (pinduoduoShopId, pinduoduoName)"
}
```

#### 404 - 商家不存在

```json
{
  "success": false,
  "message": "商家不存在"
}
```

#### 405 - 请求方法不允许

```json
{
  "success": false,
  "message": "仅支持 POST 请求"
}
```

#### 500 - 服务器错误

```json
{
  "success": false,
  "message": "服务器内部错误"
}
```

## 请求示例

### cURL

```bash
# 使用 Header 认证
curl -X POST https://admin.leapdeer.com/api/v3/merchant/update \
  -H "Content-Type: application/json" \
  -H "X-API-Key: n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4" \
  -d '{
    "merchantId": "1737513940280",
    "pinduoduoShopId": "123456789",
    "pinduoduoName": "炫朝生鲜"
  }'

# 使用 Query 参数认证
curl -X POST "https://admin.leapdeer.com/api/v3/merchant/update?apiKey=n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "1737513940280",
    "pinduoduoShopId": "123456789",
    "pinduoduoName": "炫朝生鲜"
  }'
```

### JavaScript (Fetch)

```javascript
const updateMerchant = async (merchantId, pinduoduoShopId, pinduoduoName) => {
  try {
    const response = await fetch('https://admin.leapdeer.com/api/v3/merchant/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4'
      },
      body: JSON.stringify({
        merchantId,
        pinduoduoShopId,
        pinduoduoName
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('更新成功:', result.data);
    } else {
      console.error('更新失败:', result.message);
    }

    return result;
  } catch (error) {
    console.error('请求失败:', error);
    throw error;
  }
};

// 使用示例
updateMerchant('1737513940280', '123456789', '炫朝生鲜');
```

### Python

```python
import requests
import json

def update_merchant(merchant_id, pinduoduo_shop_id=None, pinduoduo_name=None):
    url = 'https://admin.leapdeer.com/api/v3/merchant/update'

    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4'
    }

    data = {
        'merchantId': merchant_id
    }

    if pinduoduo_shop_id is not None:
        data['pinduoduoShopId'] = pinduoduo_shop_id

    if pinduoduo_name is not None:
        data['pinduoduoName'] = pinduoduo_name

    response = requests.post(url, headers=headers, json=data)
    result = response.json()

    if result['success']:
        print('更新成功:', result['data'])
    else:
        print('更新失败:', result['message'])

    return result

# 使用示例
update_merchant('1737513940280', '123456789', '炫朝生鲜')
```

### Postman 配置

1. **Method**: POST
2. **URL**: `https://admin.leapdeer.com/api/v3/merchant/update`
3. **Headers**:
   - `Content-Type`: `application/json`
   - `X-API-Key`: `n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4`
4. **Body** (raw JSON):
```json
{
  "merchantId": "1737513940280",
  "pinduoduoShopId": "123456789",
  "pinduoduoName": "炫朝生鲜"
}
```

## 使用场景

### 场景 1: 只更新拼多多店铺ID

```json
{
  "merchantId": "1737513940280",
  "pinduoduoShopId": "123456789"
}
```

### 场景 2: 只更新拼多多店铺名称

```json
{
  "merchantId": "1737513940280",
  "pinduoduoName": "炫朝生鲜"
}
```

### 场景 3: 同时更新两个字段

```json
{
  "merchantId": "1737513940280",
  "pinduoduoShopId": "123456789",
  "pinduoduoName": "炫朝生鲜"
}
```

## 注意事项

1. **API Key 安全**: 请妥善保管 API Key，不要在客户端代码中暴露
2. **幂等性**: 多次调用相同参数会覆盖之前的值
3. **部分更新**: 只会更新请求中提供的字段，未提供的字段保持不变
4. **商家ID验证**: 必须提供有效的商家ID，否则返回 404 错误
5. **字段验证**: 至少需要提供 `pinduoduoShopId` 或 `pinduoduoName` 中的一个

## 获取商家ID

如果不知道商家ID，可以先调用商家列表接口获取：

```bash
curl -X GET "https://admin.leapdeer.com/api/public/merchants?apiKey=n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4"
```

返回的数据中会包含所有商家的 `id` 字段。

## 错误排查

1. **401 错误**: 检查 API Key 是否正确
2. **404 错误**: 检查商家ID是否存在
3. **400 错误**: 检查请求参数是否完整和正确
4. **500 错误**: 查看服务器日志或联系技术支持
