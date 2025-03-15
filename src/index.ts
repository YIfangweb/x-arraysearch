/**
 * @fileoverview 高级数据搜索工具库
 * @module advanced-search
 * @description 提供类型安全的多层级对象搜索能力，支持正则、精确匹配和深度遍历。
 * 主要功能包括：
 * - 多层级嵌套对象搜索
 * - 数组自动展开
 * - 自定义匹配逻辑
 * - 安全深度控制
 * - 路径缓存优化
 * - 并行处理大数据集
 * 
 * @author onewayx
 * @license MIT
 * @version 1.0.0
 */

/**
 * 数据匹配函数类型定义
 * @template T - 搜索词类型，默认为 unknown
 * @callback MatchFunction
 * @param {unknown} value - 要匹配的值
 * @param {T} term - 搜索词
 * @returns {boolean} 是否匹配
 */
export type MatchFunction<T = unknown> = (value: unknown, term: T) => boolean;

/**
 * 搜索配置选项接口
 * @template T - 搜索词类型，默认为 unknown
 * @interface SearchOptions
 */
export interface SearchOptions<T = unknown> {
  /**
   * 指定搜索的属性路径（支持点标记法）
   * @type {string[]}
   * @optional
   * @example
   * // 简单路径
   * ['user.name', 'user.email']
   * // 数组路径
   * ['orders[].items[].name']
   * // 混合路径
   * ['user.addresses[].city', 'contacts.primary.phone']
   */
  keys?: string[];
  
  /**
   * 自定义匹配函数
   * @type {MatchFunction<T>}
   * @optional
   * @default defaultMatcher
   * @see {@link defaultMatcher}
   */
  customMatch?: MatchFunction<T>;
  
  /**
   * 最大递归深度（防止栈溢出）
   * @type {number}
   * @optional
   * @default 10
   */
  maxDepth?: number;

  /**
   * 是否启用路径缓存
   * @type {boolean}
   * @optional
   * @default true
   * @description 启用后会缓存解析后的路径，提高重复查询性能
   */
  enablePathCache?: boolean;

  /**
   * 是否并行处理大数据集
   * @type {boolean}
   * @optional
   * @default false
   * @description 当数据集大于1000条时，自动启用并行处理
   */
  parallel?: boolean;
}

/** 默认最大递归深度 */
const DEFAULT_MAX_DEPTH = 10;

/** 路径解析结果缓存 */
const pathCache = new Map<string, string[]>();

/**
 * 主搜索函数 - 在对象数组中搜索匹配项
 * @template T - 数据集元素类型，必须是对象
 * @param {T[]} data - 要搜索的对象数组
 * @param {unknown} term - 搜索关键词
 * @param {SearchOptions} [options={}] - 搜索配置选项
 * @returns {T[] | Promise<T[]>} 匹配的数据项数组，如果启用并行处理则返回 Promise
 * 
 * @throws {TypeError} 当输入数据不是数组时抛出
 * 
 * @example
 * // 基本搜索
 * const results = await searchData(users, 'john');
 * 
 * @example
 * // 指定路径搜索
 * const results = await searchData(products, 'electronics', {
 *   keys: ['category', 'tags[]']
 * });
 * 
 * @example
 * // 使用正则匹配
 * const results = await searchData(users, '^admin', {
 *   keys: ['username'],
 *   customMatch: createRegExpMatcher('i')
 * });
 * 
 * @example
 * // 并行处理大数据集
 * const results = await searchData(bigData, 'term', {
 *   parallel: true,
 *   enablePathCache: true
 * });
 */
export function searchData<T extends Record<string, any>>(
  data: T[],
  term: unknown,
  options: SearchOptions = {}
): T[] | Promise<T[]> {
  const {
    keys,
    customMatch = defaultMatcher,
    maxDepth = DEFAULT_MAX_DEPTH,
    enablePathCache = true,
    parallel = false
  } = options;

  // 并行处理大数据集
  if (parallel && data.length > 1000) {
    const chunkSize = Math.ceil(data.length / 4);
    const chunks = Array.from({ length: Math.ceil(data.length / chunkSize) }, (_, i) =>
      data.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    return (async () => {
      const results = await Promise.all(
        chunks.map(chunk =>
          new Promise<T[]>(resolve =>
            resolve(
              chunk.filter(item => matchItem(item, term, keys, customMatch, maxDepth, enablePathCache))
            )
          )
        )
      );
      return results.flat();
    })();
  }

  return data.filter(item =>
    matchItem(item, term, keys, customMatch, maxDepth, enablePathCache)
  );
}

/**
 * 单项匹配处理函数
 * @template T - 数据项类型
 * @param {T} item - 要匹配的数据项
 * @param {unknown} term - 搜索词
 * @param {string[]} [keys] - 搜索路径
 * @param {MatchFunction} [customMatch=defaultMatcher] - 自定义匹配函数
 * @param {number} [maxDepth=DEFAULT_MAX_DEPTH] - 最大递归深度
 * @param {boolean} [enablePathCache=true] - 是否启用路径缓存
 * @returns {boolean} 是否匹配
 * @private
 */
function matchItem<T extends Record<string, any>>(
  item: T,
  term: unknown,
  keys?: string[],
  customMatch = defaultMatcher,
  maxDepth = DEFAULT_MAX_DEPTH,
  enablePathCache = true
): boolean {
  if (typeof item !== 'object' || item === null) {
    return customMatch(item, term);
  }

  if (!keys || keys.length === 0) {
    const flattened = flattenObject(item, maxDepth);
    return flattened.some(value => customMatch(value, term));
  }

  return keys.some(path => {
    let values: unknown[];
    if (enablePathCache) {
      const cached = pathCache.get(path);
      if (cached) {
        values = cached.map(p => getValueByPath(item, p)).flat();
      } else {
        values = getNestedValue(item, path, maxDepth);
        pathCache.set(path, [path]);
      }
    } else {
      values = getNestedValue(item, path, maxDepth);
    }
    return values.some(value => customMatch(value, term));
  });
}

/**
 * 路径解析优化函数
 * @param {string} path - 要解析的路径字符串
 * @returns {string[]} 解析后的路径段数组
 * @private
 */
function parsePath(path: string): string[] {
  return path
    .split('.')
    .map(segment => segment.trim())
    .filter(Boolean);
}

/**
 * 优化的属性访问函数
 * @param {any} obj - 要访问的对象
 * @param {string} path - 属性路径
 * @returns {unknown} 属性值
 * @private
 */
function getValueByPath(obj: any, path: string): unknown {
  try {
    const segments = path.split('.');
    let current: any = obj;
    
    for (const segment of segments) {
      if (segment.endsWith('[]') && Array.isArray(current)) {
        const key = segment.slice(0, -2);
        return current.flatMap(item => item[key]);
      }
      current = current[segment];
      if (current === undefined) return undefined;
    }
    
    return current;
  } catch {
    return undefined;
  }
}

/**
 * 可展开类型定义
 * @typedef {object | any[]} Flattenable
 * @private
 */
type Flattenable = object | any[];

/**
 * 获取嵌套属性值
 * @template T - 对象类型
 * @param {T} obj - 目标对象
 * @param {string} path - 点分隔的属性路径
 * @param {number} depth - 剩余递归深度
 * @returns {unknown[]} 属性值数组
 * @private
 */
const getNestedValue = <T extends object>(
  obj: T,
  path: string,
  depth: number
): unknown[] => {
  const segments = path.split('.');
  let current: any = obj;
  const results: unknown[] = [];

  try {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.endsWith('[]')) {
        const key = segment.slice(0, -2);
        if (Array.isArray(current)) {
          current = current.flatMap(item => item[key]);
        } else if (current[key] && Array.isArray(current[key])) {
          current = current[key];
        } else {
          return [];
        }
      } else {
        current = current[segment];
        if (current === undefined) return [];
        if (Array.isArray(current)) {
          current = current.flat();
        }
      }
    }

    if (Array.isArray(current)) {
      results.push(...current.flat(depth));
    } else {
      results.push(current);
    }
  } catch {
    return [];
  }

  return results.filter(v => v !== undefined);
};

/**
 * 对象值扁平化处理
 * @template T - 可展开类型
 * @param {T} obj - 目标对象或数组
 * @param {number} depth - 剩余递归深度
 * @returns {unknown[]} 展开后的值数组
 * @private
 */
const flattenObject = <T extends Flattenable>(
  obj: T,
  depth: number
): unknown[] => {
  return Object.values(obj).flatMap(value => flatten(value, depth));
};

/**
 * 递归展开值
 * @param {unknown} value - 输入值
 * @param {number} depth - 剩余递归深度
 * @returns {unknown[]} 展开后的值数组
 * @private
 */
const flatten = (value: unknown, depth: number): unknown[] => {
  if (depth <= 0 || !isFlattenable(value)) return [value];
  return Object.values(value).flatMap(v => flatten(v, depth - 1));
};

/**
 * 检查值是否可展开
 * @param {unknown} value - 要检查的值
 * @returns {boolean} 是否可展开
 * @private
 */
const isFlattenable = (value: unknown): value is Flattenable => 
  typeof value === 'object' && value !== null;

/**
 * 默认匹配函数 - 不区分大小写的包含匹配
 * @type {MatchFunction}
 * @param {unknown} value - 要匹配的值
 * @param {unknown} term - 搜索词
 * @returns {boolean} 是否匹配
 * 
 * @example
 * defaultMatcher('Hello World', 'world'); // true
 * defaultMatcher('Hello World', 'HELLO'); // true
 * defaultMatcher(123, '23'); // true
 * defaultMatcher(true, 'true'); // true
 */
export const defaultMatcher: MatchFunction = (value, term) => {
  const strValue = String(value).toLowerCase();
  const strTerm = String(term).toLowerCase();
  return strValue.includes(strTerm);
};

/**
 * 创建正则表达式匹配器
 * @param {string} [flags='i'] - 正则表达式标志
 * @returns {MatchFunction<string>} 正则匹配函数
 * 
 * @example
 * const matcher = createRegExpMatcher('i');
 * matcher('Hello123', '\\d+'); // true
 * matcher('HELLO', '^hello$'); // true
 * matcher('test', '['); // false (无效的正则表达式)
 */
export const createRegExpMatcher = (flags = 'i'): MatchFunction<string> => 
  (value, pattern) => {
    try {
      return new RegExp(pattern, flags).test(String(value));
    } catch {
      return false;
    }
  };

/**
 * 精确匹配函数 - 使用严格相等运算符
 * @type {MatchFunction}
 * @param {unknown} value - 要匹配的值
 * @param {unknown} term - 搜索词
 * @returns {boolean} 是否匹配
 * 
 * @example
 * exactMatcher(123, 123); // true
 * exactMatcher('123', 123); // false
 * exactMatcher(null, null); // true
 * exactMatcher(undefined, null); // false
 */
export const exactMatcher: MatchFunction = (value, term) => value === term;
