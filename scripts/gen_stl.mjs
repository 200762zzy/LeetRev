import { writeFileSync } from 'fs'
import { resolve } from 'path'

const file = resolve('src/data/stl.ts')

let content = `import type { ApiEntry } from '../types'

export const apiData: ApiEntry[] = [
`

function add(entry) {
  content += JSON.stringify(entry, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"(id|name|category|language|full_name|signature|description|example|returns|complexity|notes|leetcode_tips|title|code)"/g, "'$1'")
    .replace(/'(id|name|category|language|full_name|signature|description|example|returns|complexity|notes|leetcode_tips|title|code)':/g, (m) => m.replace(/'/g, ''))
  content += ',\n'
}

// ========== C++ ==========
add({
  id: 'vector', name: 'vector', category: '序列容器', language: 'cpp',
  full_name: 'std::vector<T, Allocator>',
  signature: 'std::vector<T, Allocator = std::allocator<T>>',
  signatures: ['std::vector<T, Allocator = std::allocator<T>>'],
  description: '动态数组，连续内存存储，支持随机访问 O(1) 和尾部插入/删除（均摊 O(1)）。中间插入/删除为 O(n)。',
  example: '#include <vector>\nstd::vector<int> v = {1, 2, 3};\nv.push_back(4);\nv.pop_back();',
  examples: [{ title: '基础操作', code: '#include <vector>\nstd::vector<int> v;\nv.push_back(1);\nv.pop_back();\nint x = v.front();\nint y = v.back();\nv.resize(10);\nv.shrink_to_fit();' }],
  returns: '', complexity: '随机访问 O(1), 尾部插入均摊 O(1)',
  notes: 'emplace_back 在 C++11 引入，直接在容器内构造对象，避免拷贝。',
  leetcode_tips: 'vector<int> 是最常用顺序容器。reserve(n) 配合 push_back 可避免多次扩容。',
  see_also: ['deque', 'array', 'list', 'string']
})

add({
  id: 'deque', name: 'deque', category: '序列容器', language: 'cpp',
  full_name: 'std::deque<T>',
  signature: 'std::deque<T, Allocator = std::allocator<T>>',
  signatures: ['std::deque<T, Allocator = std::allocator<T>>'],
  description: '双端队列，分段连续存储，支持头尾 O(1) 插入/删除，随机访问 O(1)。',
  example: '#include <deque>\nstd::deque<int> dq;\ndq.push_back(1);\ndq.push_front(2);\ndq.pop_front();',
  examples: [{ title: '双端操作', code: '#include <deque>\nstd::deque<int> dq = {1,2,3};\ndq.push_front(0);\ndq.push_back(4);\nint f = dq.front();\nint b = dq.back();' }],
  returns: '', complexity: 'O(1) 头尾操作, O(1) 随机访问',
  notes: '比 vector 多了头插头删能力，但内存开销稍大。',
  leetcode_tips: '需要两端操作时用 deque 替代 vector。滑动窗口最大值问题可用 deque 存下标。',
  see_also: ['vector', 'list', 'array']
})

add({
  id: 'list', name: 'list', category: '序列容器', language: 'cpp',
  full_name: 'std::list<T>',
  signature: 'std::list<T, Allocator = std::allocator<T>>',
  signatures: ['std::list<T, Allocator = std::allocator<T>>'],
  description: '双向链表，任意位置插入/删除 O(1)，不支持随机访问。',
  example: '#include <list>\nstd::list<int> lst;\nlst.push_back(1);\nlst.push_front(0);',
  examples: [{ title: '插入与拼接', code: '#include <list>\nstd::list<int> a = {1,2}, b = {3,4};\na.splice(a.end(), b);' }],
  returns: '', complexity: '插入/删除 O(1), 访问 O(n)',
  notes: 'list 的迭代器在插入/删除后依然有效（除被删元素外）。',
  leetcode_tips: 'LRU Cache 可结合 list 和 unordered_map 实现。splice 是 O(1) 的链表拼接。',
  see_also: ['vector', 'deque', 'forward_list']
})

add({
  id: 'array_cpp', name: 'array', category: '序列容器', language: 'cpp',
  full_name: 'std::array<T, N>',
  signature: 'std::array<T, N>',
  signatures: ['std::array<T, N>'],
  description: '定长数组，栈上分配，大小编译期确定，不支持隐式转换为指针。',
  example: '#include <array>\nstd::array<int, 3> arr = {1,2,3};',
  examples: [{ title: '基本用法', code: '#include <array>\nstd::array<int, 5> a{};\na.fill(0);\nfor (int x : a) {}' }],
  returns: '', complexity: 'O(1) 随机访问',
  notes: '相比 C 数组，array 知道自己的大小，有 .size() 方法。',
  leetcode_tips: '定长数组场景（如 26 个字母计数）用 array 比 vector 更高效。',
  see_also: ['vector', 'string_cpp']
})

add({
  id: 'string_cpp', name: 'string (C++)', category: '序列容器', language: 'cpp',
  full_name: 'std::string',
  signature: 'std::basic_string<char>',
  signatures: ['std::basic_string<char>', 'std::wstring', 'std::string_view (C++17)'],
  description: '动态字符串，连续存储，支持查找、子串、拼接等操作。',
  example: 'std::string s = "hello";\ns += " world";',
  examples: [
    { title: '基本操作', code: 'std::string s = "leetcode";\ns.substr(0, 4);\ns.find("code");\ns.replace(0, 4, "leet");' },
    { title: 'C++17 string_view', code: '#include <string_view>\nstd::string_view sv(s);\nsv.remove_prefix(4);' }
  ],
  returns: '', complexity: '查找 O(n), 随机访问 O(1)',
  notes: 'string 的 find 返回 size_t 类型，npos 表示未找到。',
  leetcode_tips: '用 string_view 避免拷贝。s[i] - \'0\' 将字符数字转为 int。',
  see_also: ['vector', 'array_cpp']
})

console.log('C++ entries done')
