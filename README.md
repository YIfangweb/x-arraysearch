# x-ArraySearch

[![测试覆盖率](https://img.shields.io/badge/coverage-100%25-success)](https://github.com/onewayx/x-arraysearch)
![TypeScript](https://img.shields.io/badge/lang-typescript-blue)

用于复杂对象搜索的TypeScript工具库，支持：
- 多层级嵌套对象
- 数组自动展开
- 自定义匹配逻辑
- 安全深度控制

## 安装

```bash
npm install x-arraysearch
# 或
yarn add x-arraysearch
```

## 快速开始

```typescript
import { searchData, createRegExpMatcher } from 'x-arraysearch';

const products = [
  {
    id: 1,
    name: 'iPhone 13',
    details: {
      tags: ['手机', '苹果'],
      specs: {
        storage: '128GB',
        color: '暗夜绿'
      }
    }
  }
];

// 简单搜索
const results = await searchData(products, 'iPhone');

// 高级搜索
const filtered = await searchData(products, '^128', {
  keys: ['details.specs.storage'],
  customMatch: createRegExpMatcher('i')
});
```

## 核心特性

### 路径语法
- 点标记法：`'user.address.city'`
- 自动数组展开：`'orders[].product'`
- 混合路径：`'departments[].employees[].name'`

### 匹配模式
| 匹配器             | 描述                     | 示例                     |
|--------------------|--------------------------|--------------------------|
| `defaultMatcher`   | 不区分大小写包含匹配     | `'apple' → 'Apple Pie'`  |
| `exactMatcher`     | 严格类型相等匹配         | `100 不匹配 '100'`       |
| `createRegExpMatcher()` | 正则表达式匹配         | `'^d+' 匹配 '123abc'`    |

### 性能优化
- 短路匹配：发现匹配后立即停止搜索
- 深度控制：默认最大递归深度10层
- 路径缓存：优化重复路径的查询性能
- 并行处理：自动处理大数据集

### 安全特性
- 类型安全：完整的 TypeScript 类型支持
- 循环检测：自动处理循环引用
- 错误处理：优雅处理无效输入
- 深度限制：防止栈溢出

## API 文档

### `searchData<T>`
```typescript
function searchData<T extends Record<string, any>>(
  data: T[],
  term: unknown,
  options?: SearchOptions
): T[] | Promise<T[]>
```

**参数**
- `data`: 要搜索的对象数组
- `term`: 搜索关键词
- `options`: 配置选项
  - `keys`: 搜索路径数组
  - `customMatch`: 自定义匹配函数
  - `maxDepth`: 最大递归深度（默认10）
  - `enablePathCache`: 是否启用路径缓存（默认true）
  - `parallel`: 是否并行处理大数据集（默认false）

### 内置匹配器

#### `defaultMatcher`
默认的包含匹配函数，不区分大小写

#### `exactMatcher`
严格类型检查的精确匹配

#### `createRegExpMatcher(flags?)`
创建正则表达式匹配器工厂函数

## 最佳实践

### 处理大型数据集
```typescript
// 使用路径限制搜索范围
const results = await searchData(largeData, 'target', {
  keys: ['importantField', 'nested.targetField'],
  parallel: true
});
```

### 优化重复查询
```typescript
// 启用路径缓存
const options = {
  keys: ['deep.nested.field'],
  enablePathCache: true
};

// 第一次查询会缓存路径
const firstResults = await searchData(data, 'term1', options);
// 后续查询使用缓存
const secondResults = await searchData(data, 'term2', options);
```

### 自定义匹配逻辑
```typescript
const customMatcher = (value: unknown, term: unknown) => {
  if (typeof value === 'number') {
    return value > (term as number);
  }
  return defaultMatcher(value, term);
};

const results = await searchData(data, 100, { customMatch: customMatcher });
```

## 注意事项
1. 循环引用对象会自动终止遍历
2. Symbol 键名会被忽略
3. 不可枚举属性不会被搜索
4. 建议对超大数据集启用并行处理

## 贡献指南
欢迎提交 Pull Request，请确保：
1. 通过所有单元测试
2. 更新类型定义文件
3. 添加对应的文档说明

## 许可证
MIT © 2024 Your Name
