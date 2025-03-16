# X-ArraySearch

[![测试覆盖率](https://img.shields.io/badge/coverage-100%25-success)](https://github.com/YIfangweb/x-arraysearch)
![TypeScript](https://img.shields.io/badge/lang-typescript-blue)
[![Issues](https://img.shields.io/badge/x-arraysearch-issues)](https://github.com/YIfangweb/x-arraysearch/issues)

用于复杂对象搜索的TypeScript工具库，支持：
- 多层级嵌套对象
- 数组自动展开
- 自定义匹配逻辑
- 安全深度控制

## 安装

```bash
npm i x-arraysearch@latest
# 或
yarn add x-arraysearch
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
- `data`: 对象数组
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

## 使用指南

### 快速开始

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

### 基本搜索功能

#### 简单文本搜索
默认情况下，`searchData` 会在整个对象树中搜索匹配项，不区分大小写：

```typescript
// 搜索包含 "iphone" 的数据（不区分大小写）
const results = await searchData(products, 'iphone');
```

#### 搜索特定属性
通过指定 `keys` 选项限制搜索范围：

```typescript
// 只在产品名称中搜索
const results = await searchData(products, '苹果', {
  keys: ['name']
});
```

#### 递归深度控制
设置 `maxDepth` 以限制递归深度，防止过深的对象导致性能问题：

```typescript
// 限制搜索深度为3层
const results = await searchData(complexData, 'target', {
  maxDepth: 3
});
```

### 高级路径搜索

#### 点表示法搜索
可以使用点表示法精确定位嵌套属性：

```typescript
// 搜索特定嵌套属性
const results = await searchData(products, '手机', {
  keys: ['category.sub']
});
```

#### 多路径搜索
同时在多个路径中进行搜索：

```typescript
// 同时搜索颜色和标签
const results = await searchData(products, '白色', {
  keys: ['specs.color', 'tags']
});
```

#### 数组路径遍历
自动展开和搜索数组内的元素：

```typescript
// 搜索产品功能列表
const results = await searchData(products, 'Face ID', {
  keys: ['specs.features']
});
```

### 匹配器使用

#### 默认匹配器
不区分大小写的部分匹配，适用于大多数场景：

```typescript
// 默认使用 defaultMatcher
const results = await searchData(products, 'pro');

// defaultMatcher 的行为：
// - 'Hello World' 匹配 'world'
// - 123 匹配 '23'
// - true 匹配 'true'
```

#### 精确匹配器
使用严格相等比较，特别适合比较数值和布尔值：

```typescript
import { searchData, exactMatcher } from 'x-arraysearch';

// 只匹配库存数量恰好为 100 的产品
const results = await searchData(products, 100, {
  keys: ['stock.count'],
  customMatch: exactMatcher
});

// exactMatcher 的行为：
// - 123 只匹配 123 (不匹配 '123')
// - true 只匹配 true (不匹配 'true')
```

#### 正则表达式匹配器
支持使用正则表达式进行复杂模式匹配：

```typescript
import { searchData, createRegExpMatcher } from 'x-arraysearch';

// 使用正则表达式匹配所有以数字开头的型号
const regexMatcher = createRegExpMatcher('i'); // 'i' 表示不区分大小写
const results = await searchData(products, '^\\d+', {
  keys: ['model'],
  customMatch: regexMatcher
});
```

### 性能优化技术

#### 路径缓存
对于重复查询，启用路径缓存可显著提高性能：

```typescript
// 创建共享搜索配置
const searchOptions = {
  keys: ['category.sub', 'specs.features'],
  enablePathCache: true  // 默认就是 true
};

// 首次查询会缓存解析后的路径
const phoneResults = await searchData(products, '手机', searchOptions);
// 后续查询复用缓存，提高性能
const iosResults = await searchData(products, 'iOS', searchOptions);
```

#### 并行处理大数据集
处理大量数据时，启用并行处理能加快搜索速度：

```typescript
// 处理超过1000条的数据集
const results = await searchData(largeData, 'target', {
  keys: ['importantField', 'nested.targetField'],
  parallel: true  // 自动分片并行处理
});
```

### 自定义搜索逻辑

创建自定义匹配函数来实现特定的比较逻辑：

```typescript
const customMatcher = (value: unknown, term: unknown) => {
  if (typeof value === 'number') {
    return value > (term as number);
  }
  return defaultMatcher(value, term);
};

// 查找价格高于5000的所有产品
const results = await searchData(products, 5000, {
  keys: ['price'],
  customMatch: customMatcher
});
```

### 边界情况处理

#### 空数据集处理
正确处理空数组：

```typescript
// 返回空数组，不会抛出错误
const results = await searchData([], 'test');
```

#### 循环引用安全处理
自动检测并处理循环引用：

```typescript
// 创建循环引用的数据
const circularData = { name: 'test' };
circularData.self = circularData;

// 安全处理循环引用，不会导致栈溢出
const results = await searchData([circularData], 'test');
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
MIT © 2025 onewayx
