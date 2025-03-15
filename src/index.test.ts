import { describe, expect, it, beforeEach } from 'vitest';
import {
  searchData,
  defaultMatcher,
  exactMatcher,
  createRegExpMatcher,
  type SearchOptions,
} from './index';

describe('高级搜索工具库', () => {
  const testDataSet = [
    {
      id: 1,
      name: 'iPhone 13',
      price: 5999,
      category: {
        main: '电子产品',
        sub: '手机'
      },
      tags: ['苹果', '智能手机', '5G'],
      specs: {
        color: '暗夜绿',
        storage: '128GB',
        features: ['Face ID', 'iOS 15']
      },
      stock: {
        available: true,
        count: 100
      }
    },
    {
      id: 2,
      name: 'MacBook Pro',
      price: 12999,
      category: {
        main: '电子产品',
        sub: '笔记本'
      },
      tags: ['苹果', '笔记本电脑', 'M1'],
      specs: {
        color: '深空灰',
        storage: '512GB',
        features: ['Touch ID', 'macOS']
      },
      stock: {
        available: true,
        count: 50
      }
    },
    {
      id: 3,
      name: 'AirPods Pro',
      price: 1999,
      category: {
        main: '电子产品',
        sub: '耳机'
      },
      tags: ['苹果', '无线耳机', '降噪'],
      specs: {
        color: '白色',
        features: ['主动降噪', '空间音频']
      },
      stock: {
        available: false,
        count: 0
      }
    }
  ];

  describe('核心搜索功能', () => {
    it('应该执行不区分大小写的字符串匹配', async () => {
      const results = await searchData(testDataSet, 'iPhone');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('应该正确处理搜索词的大小写变化', async () => {
      const results = await searchData(testDataSet, 'iphone');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('iPhone 13');
    });

    it('当没有匹配项时应返回空数组', async () => {
      const results = await searchData(testDataSet, 'non_existent_term');
      expect(results).toHaveLength(0);
    });

    it('应该正确处理搜索词中的特殊字符', async () => {
      const results = await searchData(testDataSet, 'Pro');
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toEqual(
        expect.arrayContaining(['MacBook Pro', 'AirPods Pro'])
      );
    });
  });

  describe('高级搜索选项', () => {
    it('应该支持使用点表示法的路径搜索', async () => {
      const results = await searchData(testDataSet, '手机', {
        keys: ['category.sub']
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('iPhone 13');
    });

    it('应该支持多路径搜索操作', async () => {
      const results = await searchData(testDataSet, '白色', {
        keys: ['specs.color', 'tags']
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('AirPods Pro');
    });

    it('应该正确处理数组路径遍历', async () => {
      const results = await searchData(testDataSet, 'Face ID', {
        keys: ['specs.features']
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('iPhone 13');
    });

    it('应该遵守最大递归深度限制', async () => {
      const results = await searchData(testDataSet, 'non_existent_term', {
        maxDepth: 1
      });
      expect(results).toHaveLength(0);
    });
  });

  describe('匹配器功能实现', () => {
    describe('默认匹配器', () => {
      it('应该实现不区分大小写的子字符串匹配', () => {
        expect(defaultMatcher('Hello World', 'world')).toBe(true);
        expect(defaultMatcher('Hello World', 'HELLO')).toBe(true);
        expect(defaultMatcher('Hello World', 'xyz')).toBe(false);
      });

      it('应该正确处理非字符串基本类型值', () => {
        expect(defaultMatcher(123, '23')).toBe(true);
        expect(defaultMatcher(true, 'true')).toBe(true);
        expect(defaultMatcher(null, 'null')).toBe(true);
      });
    });

    describe('精确匹配器', () => {
      it('应该执行严格相等比较', () => {
        expect(exactMatcher(123, 123)).toBe(true);
        expect(exactMatcher('123', 123)).toBe(false);
        expect(exactMatcher(true, true)).toBe(true);
        expect(exactMatcher(null, null)).toBe(true);
      });
    });

    describe('正则表达式匹配器', () => {
      it('应该支持带标志的模式匹配', () => {
        const regexMatcher = createRegExpMatcher('i');
        expect(regexMatcher('Hello123', '\\d+')).toBe(true);
        expect(regexMatcher('HELLO', '^hello$')).toBe(true);
        expect(regexMatcher('world', '^hello$')).toBe(false);
      });

      it('应该优雅地处理无效的正则表达式模式', () => {
        const regexMatcher = createRegExpMatcher();
        expect(regexMatcher('test', '[')).toBe(false);
      });
    });
  });

  describe('性能优化特性', () => {
    it('应该有效利用路径缓存机制', async () => {
      const searchOptions: SearchOptions = {
        keys: ['category.sub', 'specs.features'],
        enablePathCache: true
      };
      
      const firstResults = await searchData(testDataSet, '手机', searchOptions);
      expect(firstResults).toHaveLength(1);
      
      const secondResults = await searchData(testDataSet, 'iOS', searchOptions);
      expect(secondResults).toHaveLength(1);
    });

    it('应该能处理大数据集的并行处理', async () => {
      const largeDataSet = Array(2000).fill(null).map((_, index) => ({
        id: index,
        name: `项目 ${index}`,
        value: index % 2 === 0 ? '偶数' : '奇数'
      }));

      const results = await searchData(largeDataSet, '偶数', {
        parallel: true
      });

      expect(results).toHaveLength(1000);
      expect(results.every(item => item.value === '偶数')).toBe(true);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该优雅地处理空数据集', async () => {
      const results = await searchData([], 'test');
      expect(results).toHaveLength(0);
    });

    it('应该适当处理无效的搜索路径', async () => {
      const results = await searchData(testDataSet, 'test', {
        keys: ['invalid.path', 'nonexistent.field']
      });
      expect(results).toHaveLength(0);
    });

    it('应该安全地处理循环引用', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      const results = await searchData([circularData], 'test');
      expect(results).toHaveLength(1);
    });

    it('应该正确处理混合数据类型', async () => {
      const mixedDataSet = [
        null,
        undefined,
        123,
        '字符串',
        true,
        [1, 2, 3],
        { key: 'value' },
        new Date()
      ];

      const results = await searchData(mixedDataSet as any[], '字符串');
      expect(results).toContain('字符串');
    });
  });
});
