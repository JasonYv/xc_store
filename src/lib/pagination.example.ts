/**
 * 分页工具类使用示例
 *
 * 此文件展示了如何在不同场景下使用分页工具类
 */

import { PaginationHelper, QueryBuilder, PaginationParams } from './pagination';
import { Database as SQLiteDatabase } from 'sqlite';

// ============================================================
// 示例 1: 基本分页查询
// ============================================================
async function example1_basicPagination(db: SQLiteDatabase) {
  const params: PaginationParams = {
    page: 1,
    pageSize: 10
  };

  const result = await PaginationHelper.paginate(
    db,
    'merchants',
    params,
    (row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt
    })
  );

  console.log('总记录数:', result.total);
  console.log('当前页:', result.page);
  console.log('总页数:', result.totalPages);
  console.log('数据:', result.items);
}

// ============================================================
// 示例 2: 带搜索的分页查询
// ============================================================
async function example2_paginationWithSearch(db: SQLiteDatabase) {
  const params: PaginationParams = {
    page: 1,
    pageSize: 20,
    search: '张三',
    searchFields: ['name', 'groupName', 'merchantId']
  };

  const result = await PaginationHelper.paginate(
    db,
    'merchants',
    params,
    (row) => row
  );

  // 返回所有包含"张三"的商家记录（在name、groupName或merchantId字段中）
  console.log('搜索结果:', result.items);
}

// ============================================================
// 示例 3: 带排序的分页查询
// ============================================================
async function example3_paginationWithSort(db: SQLiteDatabase) {
  const params: PaginationParams = {
    page: 1,
    pageSize: 10,
    orderBy: 'createdAt',
    orderDirection: 'DESC' // 按创建时间降序排列
  };

  const result = await PaginationHelper.paginate(
    db,
    'merchants',
    params,
    (row) => row
  );

  console.log('按创建时间降序排列:', result.items);
}

// ============================================================
// 示例 4: 完整的分页查询（搜索+排序+分页）
// ============================================================
async function example4_fullPagination(db: SQLiteDatabase) {
  const params: PaginationParams = {
    page: 2,                  // 第2页
    pageSize: 15,             // 每页15条
    search: '杭州',           // 搜索关键词
    searchFields: ['name', 'warehouse1', 'groupName'], // 搜索字段
    orderBy: 'name',          // 按名称排序
    orderDirection: 'ASC'     // 升序
  };

  const result = await PaginationHelper.paginate(
    db,
    'merchants',
    params,
    (row) => ({
      id: row.id,
      name: row.name,
      warehouse1: row.warehouse1,
      groupName: row.groupName
    })
  );

  return result;
}

// ============================================================
// 示例 5: 从URL查询参数创建分页参数
// ============================================================
function example5_fromUrlQuery() {
  // 模拟Next.js的query对象
  const query = {
    page: '3',
    pageSize: '20',
    search: '商家名称',
    orderBy: 'createdAt',
    orderDirection: 'desc'
  };

  // 自动解析并验证参数
  const params = PaginationHelper.fromQuery(query);

  console.log('解析后的参数:', params);
  // 输出: {
  //   page: 3,
  //   pageSize: 20,
  //   search: '商家名称',
  //   searchFields: undefined,
  //   orderBy: 'createdAt',
  //   orderDirection: 'DESC'
  // }
}

// ============================================================
// 示例 6: 使用QueryBuilder手动构建复杂查询
// ============================================================
async function example6_advancedQuery(db: SQLiteDatabase) {
  const builder = new QueryBuilder('merchants');

  // 构建复杂查询
  builder
    .select('id, name, warehouse1, createdAt')
    .where('sendMessage = ?', 1)  // 只查询开启消息的商家
    .search('杭州', ['name', 'warehouse1']) // 搜索包含"杭州"的记录
    .orderBy('createdAt', 'DESC')
    .paginate(1, 10);

  const query = builder.buildQuery();
  const countQuery = builder.buildCountQuery();

  console.log('生成的SQL:', query.sql);
  console.log('参数:', query.params);

  // 执行查询
  const [rows, countResult] = await Promise.all([
    db.all(query.sql, ...query.params),
    db.get(countQuery.sql, ...countQuery.params)
  ]);

  return {
    items: rows,
    total: countResult.count
  };
}

// ============================================================
// 示例 7: 在API路由中使用
// ============================================================
/*
// /api/merchants.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // 从URL参数创建分页参数
    const paginationParams = PaginationHelper.fromQuery(req.query);

    // 添加搜索字段（因为fromQuery不会自动设置）
    paginationParams.searchFields = ['name', 'merchantId', 'warehouse1', 'groupName'];

    // 执行分页查询
    const result = await db.getMerchantsPaginated(
      paginationParams.page,
      paginationParams.pageSize,
      paginationParams.search,
      paginationParams.orderBy,
      paginationParams.orderDirection
    );

    return res.status(200).json(result);
  }
}
*/

// ============================================================
// 示例 8: 参数验证
// ============================================================
function example8_validateParams() {
  // 自动修正不合法的参数
  const params = PaginationHelper.validateParams({
    page: -1,        // 会被修正为1
    pageSize: 200,   // 会被修正为100（最大值）
    orderDirection: 'invalid' as any // 会被修正为'DESC'
  });

  console.log('验证后的参数:', params);
  // 输出: {
  //   page: 1,
  //   pageSize: 100,
  //   search: undefined,
  //   searchFields: [],
  //   orderBy: undefined,
  //   orderDirection: 'DESC'
  // }
}

// ============================================================
// 导出示例
// ============================================================
export const examples = {
  example1_basicPagination,
  example2_paginationWithSearch,
  example3_paginationWithSort,
  example4_fullPagination,
  example5_fromUrlQuery,
  example6_advancedQuery,
  example8_validateParams
};
