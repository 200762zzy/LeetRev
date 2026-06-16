import { appendFileSync } from 'fs'
import { resolve } from 'path'

const file = resolve('src/data/stl.ts')

function add(raw) {
  appendFileSync(file, raw + ',\n', 'utf8')
}

// === C++: Optional / Variant ===
add(`  {
    id: 'optional',
    name: 'optional',
    category: '工具',
    language: 'cpp',
    full_name: 'std::optional<T> (C++17)',
    signature: 'std::optional<T>',
    signatures: ['std::optional<T>'],
    description: '可能包含值也可能不包含的类型，替代指针或哨兵值。',
    example: '#include <optional>\\nstd::optional<int> o = 42;\\nif (o) { int v = o.value(); }',
    examples: [{ title: '函数返回 optional', code: 'std::optional<int> safe_div(int a, int b) {\\n  if (b == 0) return std::nullopt;\\n  return a / b;\\n}' }],
    returns: '',
    complexity: '',
    notes: 'value_or(default) 提供默认值。没有值时可抛 std::bad_optional_access。',
    leetcode_tips: '查找未找到时用 optional 替代 -1 或 nullptr。',
    see_also: ['variant', 'any', 'shared_ptr']
  }`)

add(`  {
    id: 'variant',
    name: 'variant',
    category: '工具',
    language: 'cpp',
    full_name: 'std::variant<Types...> (C++17)',
    signature: 'std::variant<Types...>',
    signatures: ['std::variant<Types...>'],
    description: '类型安全的联合体，存储多种类型中的一种。',
    example: '#include <variant>\\nstd::variant<int, string> v = 42;\\nv = "hello";\\nstd::visit([](auto&&){}, v);',
    examples: [{ title: 'visit 模式', code: 'std::variant<int, string> v;\\nv = 42;\\nstd::visit([](auto&& val) { cout << val; }, v);' }],
    returns: '',
    complexity: '',
    notes: 'get_if<T>() 判断当前类型。bad_variant_access 异常。',
    leetcode_tips: '不同类型节点的抽象语法树可以用 variant。',
    see_also: ['optional', 'any']
  }`)

// === C++: Algorithms ===
add(`  {
    id: 'sort',
    name: 'sort',
    category: '算法',
    language: 'cpp',
    full_name: 'std::sort',
    signature: 'void sort(RandomIt first, RandomIt last, Compare comp = {})',
    signatures: ['void sort(RandomIt first, RandomIt last)', 'void sort(RandomIt first, RandomIt last, Compare comp)'],
    description: '对范围内的元素排序，平均 O(n log n)。IntroSort 混合算法。',
    example: '#include <algorithm>\\nstd::vector<int> v = {3,1,2};\\nstd::sort(v.begin(), v.end());',
    examples: [
      { title: '自定义排序', code: 'vector<pair<int,int>> v = {{1,2},{2,1}};\\nsort(v.begin(), v.end(), [](auto& a, auto& b) {\\n  return a.second < b.second;\\n});' },
      { title: '降序', code: 'vector<int> v = {1,2,3};\\nsort(v.begin(), v.end(), greater<int>());' }
    ],
    returns: '',
    complexity: 'O(n log n)',
    notes: '要求随机访问迭代器（vector, deque, array 可用，list 不可用）。',
    leetcode_tips: '排序后常配合双指针或二分查找。部分排序用 nth_element。',
    see_also: ['stable_sort', 'partial_sort', 'nth_element']
  }`)

add(`  {
    id: 'lower_upper_bound',
    name: 'lower_bound / upper_bound',
    category: '算法',
    language: 'cpp',
    full_name: 'std::lower_bound / std::upper_bound',
    signature: 'ForwardIt lower_bound(ForwardIt first, ForwardIt last, const T& value)',
    signatures: [
      'ForwardIt lower_bound(ForwardIt first, ForwardIt last, const T& value)',
      'ForwardIt upper_bound(ForwardIt first, ForwardIt last, const T& value)',
      'bool binary_search(ForwardIt first, ForwardIt last, const T& value)'
    ],
    description: '对有序范围进行二分查找。lower_bound 返回首个 >= value 的位置，upper_bound 返回首个 > value 的位置。',
    example: '#include <algorithm>\\nstd::vector<int> v = {1,2,2,3,4};\\nauto it = std::lower_bound(v.begin(), v.end(), 2);',
    examples: [{ title: '区间查找', code: 'vector<int> v = {1,2,2,3,4};\\nint l = lower_bound(v.begin(),v.end(),2) - v.begin();\\nint r = upper_bound(v.begin(),v.end(),2) - v.begin();\\nint cnt = r - l;\\nbool ok = binary_search(v.begin(),v.end(),2);' }],
    returns: 'lower_bound/upper_bound 返回迭代器，binary_search 返回 bool',
    complexity: 'O(log n)',
    notes: '必须在有序范围上使用。lower_bound - begin() 获取下标。',
    leetcode_tips: '二分答案常用：对有序数组用 lower_bound 找第一个 >= target 的元素。',
    see_also: ['sort', 'equal_range', 'binary_search']
  }`)

add(`  {
    id: 'reverse_accumulate',
    name: 'reverse / accumulate',
    category: '算法',
    language: 'cpp',
    full_name: 'std::reverse / std::accumulate',
    signature: 'void reverse(BidirIt first, BidirIt last)',
    signatures: [
      'void reverse(BidirIt first, BidirIt last)',
      'T accumulate(InputIt first, InputIt last, T init)',
      'T accumulate(InputIt first, InputIt last, T init, BinaryOp op)'
    ],
    description: 'reverse 反转范围内的元素顺序。accumulate 累加范围内的值。',
    example: '#include <numeric>\\nstd::vector<int> v = {1,2,3};\\nint sum = std::accumulate(v.begin(), v.end(), 0);',
    examples: [
      { title: 'accumulate', code: 'vector<int> v = {1,2,3};\\nint sum = accumulate(v.begin(), v.end(), 0);\\nint prod = accumulate(v.begin(), v.end(), 1, multiplies<int>());' },
      { title: 'reverse', code: 'vector<int> v = {1,2,3};\\nreverse(v.begin(), v.end()); // {3,2,1}' }
    ],
    returns: 'reverse 无返回值，accumulate 返回累加值',
    complexity: 'reverse O(n), accumulate O(n)',
    notes: 'reverse 要求双向迭代器。accumulate 在 <numeric> 中。',
    leetcode_tips: '字符串反转、链表反转常用 reverse 或自定义。accumulate 的 init 类型决定返回类型。',
    see_also: ['sort', 'for_each', 'transform']
  }`)

add(`  {
    id: 'bitset',
    name: 'bitset',
    category: '工具',
    language: 'cpp',
    full_name: 'std::bitset<N>',
    signature: 'std::bitset<N>',
    signatures: ['std::bitset<N>'],
    description: '固定大小的位集合，编译期决定大小。支持位运算 & | ^ ~ << >>。',
    example: '#include <bitset>\\nstd::bitset<8> b(0b1010);\\nb.set(2);\\nb.reset(1);\\nb.flip();',
    examples: [{ title: '位集操作', code: 'std::bitset<8> b("10101010");\\nb.count();\\nb.any();\\nb.test(3);' }],
    returns: '',
    complexity: 'O(n) 大多数操作',
    notes: 'bitset 比 vector<bool> 更高效，位运算时间复杂度与 N/word_size 相关。',
    leetcode_tips: '状态压缩 DP 可以用 bitset 优化。count() 统计 1 的个数。',
    see_also: ['vector']
  }`)

add(`  {
    id: 'shared_ptr',
    name: 'shared_ptr / unique_ptr',
    category: '智能指针',
    language: 'cpp',
    full_name: 'std::shared_ptr<T> / std::unique_ptr<T>',
    signature: 'std::shared_ptr<T> / std::unique_ptr<T>',
    signatures: [
      'std::shared_ptr<T> (C++11)',
      'std::unique_ptr<T> (C++11)',
      'auto make_shared<T>(Args&&...)',
      'auto make_unique<T>(Args&&...)'
    ],
    description: 'shared_ptr 引用计数共享所有权，unique_ptr 独占所有权。make_shared/make_unique 推荐创建方式。',
    example: '#include <memory>\\nauto sp = std::make_shared<int>(42);\\nauto up = std::make_unique<int>(42);',
    examples: [
      { title: 'shared_ptr', code: 'auto sp = make_shared<int>(42);\\n{ auto sp2 = sp; cout << sp.use_count(); }' },
      { title: 'unique_ptr 转移', code: 'auto up = make_unique<int>(42);\\nauto up2 = std::move(up);' }
    ],
    returns: '',
    complexity: '',
    notes: 'make_shared 比 new + shared_ptr 更高效。unique_ptr 不可复制，只能移动。',
    leetcode_tips: '链表、树等递归结构用 unique_ptr 或裸指针即可，shared_ptr 有循环引用风险。',
    see_also: ['optional', 'variant']
  }`)

console.log('C++ algorithms + pointers done')
