import { appendFileSync } from 'fs'
import { resolve } from 'path'

const file = resolve('src/data/stl.ts')

function add(raw) {
  appendFileSync(file, raw + ',\n', 'utf8')
}

// === C++: Associative Containers ===
add(`  {
    id: 'map',
    name: 'map',
    category: '关联容器',
    language: 'cpp',
    full_name: 'std::map<K, V>',
    signature: 'std::map<Key, T, Compare = std::less<Key>>',
    signatures: ['std::map<Key, T, Compare = std::less<Key>>'],
    description: '有序键值对映射，基于红黑树，查找/插入/删除 O(log n)。',
    example: '#include <map>\\nstd::map<string, int> m;\\nm["alice"] = 1;',
    examples: [{ title: '遍历与查找', code: 'std::map<int, string> m = {{1,"a"},{2,"b"}};\\nfor (auto& [k, v] : m) {}\\nauto it = m.find(1);\\nif (it != m.end()) {}' }],
    returns: '',
    complexity: 'O(log n) 查找/插入/删除',
    notes: 'map 按键升序排列。operator[] 会插入默认值。emplace 可避免拷贝。',
    leetcode_tips: '需要按键排序时用 map。operator[] 前用 count/find 检查存在性。',
    see_also: ['unordered_map', 'set', 'multimap']
  }`)

add(`  {
    id: 'unordered_map',
    name: 'unordered_map',
    category: '关联容器',
    language: 'cpp',
    full_name: 'std::unordered_map<K, V>',
    signature: 'std::unordered_map<Key, T, Hash = std::hash<Key>>',
    signatures: ['std::unordered_map<Key, T, Hash = std::hash<Key>>'],
    description: '无序键值对映射，基于哈希表，平均 O(1) 查找。内存开销比 map 大。',
    example: '#include <unordered_map>\\nstd::unordered_map<string, int> m;\\nm["a"]++;',
    examples: [{ title: '计数用法', code: 'std::unordered_map<char,int> freq;\\nfor (char c : s) freq[c]++;\\nfor (auto& [k,v] : freq) {}' }],
    returns: '',
    complexity: '平均 O(1), 最坏 O(n)',
    notes: '自定义键类型需要提供 hash 函数。C++20 支持 contains。',
    leetcode_tips: '两数之和、字母异位词分组等哈希表题的默认选择。reserve(n) 可减少 rehash。',
    see_also: ['map', 'unordered_set']
  }`)

add(`  {
    id: 'set',
    name: 'set',
    category: '关联容器',
    language: 'cpp',
    full_name: 'std::set<T>',
    signature: 'std::set<Key, Compare = std::less<Key>>',
    signatures: ['std::set<Key, Compare = std::less<Key>>'],
    description: '有序集合，元素唯一，基于红黑树，O(log n) 操作。',
    example: '#include <set>\\nstd::set<int> s = {3,1,2};\\ns.insert(4);',
    examples: [{ title: '集合操作', code: 'std::set<int> a = {1,2,3}, b = {2,3,4};\\nset<int> res;\\nset_intersection(a,b,inserter(res,res.end()));' }],
    returns: '',
    complexity: 'O(log n) 插入/删除/查找',
    notes: 'insert 返回 pair<iterator,bool>。set 的元素不可修改。',
    leetcode_tips: '用于维护有序唯一集合。lower_bound/upper_bound 查找范围。',
    see_also: ['unordered_set', 'map', 'multiset']
  }`)

add(`  {
    id: 'unordered_set',
    name: 'unordered_set',
    category: '关联容器',
    language: 'cpp',
    full_name: 'std::unordered_set<T>',
    signature: 'std::unordered_set<Key, Hash = std::hash<Key>>',
    signatures: ['std::unordered_set<Key, Hash = std::hash<Key>>'],
    description: '无序集合，基于哈希表，平均 O(1) 查找。',
    example: '#include <unordered_set>\\nstd::unordered_set<int> s;\\ns.insert(1);',
    examples: [{ title: '去重用法', code: 'std::vector<int> v = {1,2,2,3};\\nstd::unordered_set<int> s(v.begin(), v.end());' }],
    returns: '',
    complexity: '平均 O(1), 最坏 O(n)',
    notes: '元素无特定顺序。C++20 支持 contains。',
    leetcode_tips: '判断元素是否出现过、去重等场景的首选。',
    see_also: ['set', 'unordered_map']
  }`)

console.log('C++ associative containers appended')
