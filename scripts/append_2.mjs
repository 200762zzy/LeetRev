import { appendFileSync } from 'fs'
import { resolve } from 'path'

const file = resolve('src/data/stl.ts')

function add(raw) {
  appendFileSync(file, raw + ',\n', 'utf8')
}

// === C++: Container Adaptors ===
add(`  {
    id: 'stack',
    name: 'stack',
    category: '容器适配器',
    language: 'cpp',
    full_name: 'std::stack<T>',
    signature: 'std::stack<T, Container = std::deque<T>>',
    signatures: ['std::stack<T, Container = std::deque<T>>'],
    description: '栈适配器，LIFO。默认底层为 deque。只提供 push/pop/top 操作。',
    example: '#include <stack>\\nstd::stack<int> stk;\\nstk.push(1);\\nstk.pop();\\nint t = stk.top();',
    examples: [{ title: '栈的应用', code: 'std::stack<int> stk;\\nstk.push(10);\\nstk.push(20);\\nwhile (!stk.empty()) {\\n  int t = stk.top(); stk.pop();\\n}' }],
    returns: '',
    complexity: 'O(1) 所有操作',
    notes: 'stack 不提供迭代器，不能遍历。底层容器可以是 deque/vector/list。',
    leetcode_tips: '括号匹配、单调栈、DFS 模拟都用 stack。',
    see_also: ['queue', 'priority_queue', 'deque']
  }`)

add(`  {
    id: 'queue',
    name: 'queue',
    category: '容器适配器',
    language: 'cpp',
    full_name: 'std::queue<T>',
    signature: 'std::queue<T, Container = std::deque<T>>',
    signatures: ['std::queue<T, Container = std::deque<T>>'],
    description: '队列适配器，FIFO。默认底层为 deque。',
    example: '#include <queue>\\nstd::queue<int> q;\\nq.push(1);\\nq.pop();\\nint f = q.front();',
    examples: [{ title: 'BFS 队列', code: 'std::queue<int> q;\\nq.push(start);\\nwhile (!q.empty()) {\\n  int cur = q.front(); q.pop();\\n}' }],
    returns: '',
    complexity: 'O(1) 所有操作',
    notes: 'queue 不提供迭代器。底层容器可以是 deque/list。',
    leetcode_tips: 'BFS、树的层序遍历用 queue。',
    see_also: ['stack', 'priority_queue', 'deque']
  }`)

add(`  {
    id: 'priority_queue',
    name: 'priority_queue',
    category: '容器适配器',
    language: 'cpp',
    full_name: 'std::priority_queue<T>',
    signature: 'std::priority_queue<T, Container = std::vector<T>, Compare = std::less<T>>',
    signatures: ['std::priority_queue<T, Container = std::vector<T>, Compare = std::less<T>>'],
    description: '优先队列（最大堆），默认大的优先。支持 push/pop/top。',
    example: '#include <queue>\\nstd::priority_queue<int> pq;\\npq.push(3);\\npq.push(1);\\npq.push(2);\\nint t = pq.top();',
    examples: [
      { title: '最大堆', code: 'std::priority_queue<int> pq;\\npq.push(3); pq.push(1); pq.push(2);\\n// top() = 3' },
      { title: '最小堆', code: 'std::priority_queue<int, vector<int>, greater<int>> min_pq;\\nmin_pq.push(3); min_pq.push(1);\\n// top() = 1' }
    ],
    returns: '',
    complexity: 'push/pop O(log n), top O(1)',
    notes: '默认 less<T> 为最大堆。greater<T> 为最小堆。自定义 compare 需 strict weak ordering。',
    leetcode_tips: 'Top K 问题、合并 K 个有序链表、Dijkstra 算法。',
    see_also: ['queue', 'stack', 'vector']
  }`)

// === C++: Utilities ===
add(`  {
    id: 'pair',
    name: 'pair',
    category: '工具',
    language: 'cpp',
    full_name: 'std::pair<T1, T2>',
    signature: 'std::pair<T1, T2>',
    signatures: ['std::pair<T1, T2>'],
    description: '存放两个值的简单结构体。支持 ==, <, 结构化绑定。',
    example: 'std::pair<int, string> p = {1, "a"};\\ncout << p.first << p.second;',
    examples: [{ title: '结构化绑定 (C++17)', code: 'std::pair<int, string> p = {1, "a"};\\nauto [id, name] = p;' }],
    returns: '',
    complexity: '',
    notes: 'make_pair 可自动推导类型。pair 默认按 first, second 字典序比较。',
    leetcode_tips: 'map 的元素类型就是 pair<const Key, T>。',
    see_also: ['tuple', 'map']
  }`)

add(`  {
    id: 'tuple',
    name: 'tuple',
    category: '工具',
    language: 'cpp',
    full_name: 'std::tuple<Types...>',
    signature: 'std::tuple<Types...>',
    signatures: ['std::tuple<Types...>'],
    description: '存放任意数量不同类型值的定长元组。',
    example: '#include <tuple>\\nstd::tuple<int, double, string> t = {1, 2.5, "a"};',
    examples: [{ title: '访问与解包', code: 'auto t = std::make_tuple(1, 2.5, "a");\\nauto [a, b, c] = t; // C++17 structured binding' }],
    returns: '',
    complexity: '',
    notes: '用 std::get<0>(t) 或 std::get<int>(t) 访问。tuple_cat 可拼接。',
    leetcode_tips: '需要返回多个值时用 tuple 替代 pair。',
    see_also: ['pair']
  }`)

console.log('C++ adaptors + utilities done')
