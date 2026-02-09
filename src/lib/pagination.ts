import { Database as SQLiteDatabase } from 'sqlite';

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;           // 当前页码，从1开始
  pageSize: number;       // 每页显示数量
  search?: string;        // 搜索关键词
  searchFields?: string[]; // 搜索的字段列表
  orderBy?: string;       // 排序字段
  orderDirection?: 'ASC' | 'DESC'; // 排序方向
}

/**
 * 分页查询结果
 */
export interface PaginationResult<T> {
  items: T[];           // 当前页的数据
  total: number;        // 总记录数
  page: number;         // 当前页码
  pageSize: number;     // 每页显示数量
  totalPages: number;   // 总页数
}

/**
 * SQL查询构建器
 */
export class QueryBuilder {
  private table: string;
  private selectFields: string = '*';
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';

  constructor(table: string) {
    this.table = table;
  }

  /**
   * 设置查询字段
   */
  select(fields: string): QueryBuilder {
    this.selectFields = fields;
    return this;
  }

  /**
   * 添加WHERE条件
   */
  where(condition: string, ...params: any[]): QueryBuilder {
    this.whereConditions.push(condition);
    this.whereParams.push(...params);
    return this;
  }

  /**
   * 添加搜索条件（多字段LIKE查询）
   */
  search(keyword: string, fields: string[]): QueryBuilder {
    if (!keyword || fields.length === 0) return this;

    const searchTerm = `%${keyword}%`;
    const conditions = fields.map(field => `${field} LIKE ?`).join(' OR ');
    this.whereConditions.push(`(${conditions})`);

    // 为每个字段添加相同的搜索参数
    fields.forEach(() => {
      this.whereParams.push(searchTerm);
    });

    return this;
  }

  /**
   * 设置排序
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  /**
   * 设置原始排序（支持多字段）
   */
  orderByRaw(rawOrderBy: string): QueryBuilder {
    this.orderByClause = `ORDER BY ${rawOrderBy}`;
    return this;
  }

  /**
   * 设置分页
   */
  paginate(page: number, pageSize: number): QueryBuilder {
    const offset = (page - 1) * pageSize;
    this.limitClause = `LIMIT ${pageSize}`;
    this.offsetClause = `OFFSET ${offset}`;
    return this;
  }

  /**
   * 构建完整的查询SQL
   */
  buildQuery(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields} FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }

    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }

    if (this.offsetClause) {
      sql += ` ${this.offsetClause}`;
    }

    return {
      sql,
      params: this.whereParams
    };
  }

  /**
   * 构建COUNT查询SQL
   */
  buildCountQuery(): { sql: string; params: any[] } {
    let sql = `SELECT COUNT(*) as count FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    return {
      sql,
      params: this.whereParams
    };
  }
}

/**
 * 通用分页查询工具类
 */
export class PaginationHelper {
  /**
   * 执行分页查询
   * @param db SQLite数据库实例
   * @param table 表名
   * @param params 分页参数
   * @param rowMapper 行数据映射函数
   * @returns 分页结果
   */
  static async paginate<T>(
    db: SQLiteDatabase,
    table: string,
    params: PaginationParams,
    rowMapper: (row: any) => T
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      pageSize = 10,
      search,
      searchFields = [],
      orderBy,
      orderDirection = 'DESC'
    } = params;

    // 构建查询
    const builder = new QueryBuilder(table);

    // 添加搜索条件
    if (search && searchFields.length > 0) {
      builder.search(search, searchFields);
    }

    // 添加排序
    if (orderBy) {
      builder.orderBy(orderBy, orderDirection);
    }

    // 添加分页
    builder.paginate(page, pageSize);

    // 执行查询
    const query = builder.buildQuery();
    const countQuery = builder.buildCountQuery();

    const [rows, countResult] = await Promise.all([
      db.all(query.sql, ...query.params),
      db.get(countQuery.sql, ...countQuery.params)
    ]);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: rows.map(rowMapper),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * 验证分页参数
   */
  static validateParams(params: Partial<PaginationParams>): PaginationParams {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10));

    return {
      page,
      pageSize,
      search: params.search,
      searchFields: params.searchFields || [],
      orderBy: params.orderBy,
      orderDirection: params.orderDirection || 'DESC'
    };
  }

  /**
   * 从URL查询参数创建分页参数
   */
  static fromQuery(query: any): PaginationParams {
    return this.validateParams({
      page: parseInt(query.page) || 1,
      pageSize: parseInt(query.pageSize) || 10,
      search: query.search || undefined,
      searchFields: query.searchFields ?
        (Array.isArray(query.searchFields) ? query.searchFields : [query.searchFields])
        : undefined,
      orderBy: query.orderBy || undefined,
      orderDirection: (query.orderDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC'
    });
  }
}

/**
 * 创建简单的分页响应
 */
export function createPaginationResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginationResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}
