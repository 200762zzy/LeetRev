import { writeFileSync } from 'fs'

const out = []
function E(o) { out.push(JSON.stringify(o, null, 2).replace(/"([^"]+)":/g,'$1:').replace(/: "([^"]*)"(,?)$/gm,': \'$1\'$2').replace(/: '([^']*)'/g,(m)=>m.replace(/'/g,"'")).replace(/: (\[[^\]]*\])/g,(m)=>m.replace(/'/g,"'")) }

E({
  id:'vector',name:'vector',category:'序列容器',language:'cpp',full_name:'std::vector<T, Allocator>',
  signature:'std::vector<T, Allocator = std::allocator<T>>',
  signatures:['std::vector<T, Allocator = std::allocator<T>>'],
  description:'动态数组，连续内存存储，支持随机访问 O(1) 和尾部插入/删除（均摊 O(1)）。中间插入/删除为 O(n)。',
  example:'#include <vector>\nstd::vector<int> v = {1, 2, 3};\nv.push_back(4);\nv.pop_back();',
  examples:[{title:'基础操作',code:'#include <vector>\nstd::vector<int> v;\nv.push_back(1);\nv.pop_back();\nint x = v.front();\nint y = v.back();\nv.resize(10);\nv.shrink_to_fit();'}],
  returns:'',complexity:'随机访问 O(1), 尾部插入均摊 O(1)',
  notes:'emplace_back 在 C++11 引入，直接在容器内构造对象，避免拷贝。',
  leetcode_tips:'vector<int> 是最常用顺序容器。reserve(n) 配合 push_back 可避免多次扩容。',
  see_also:['deque','array_cpp','list','string_cpp']
})

writeFileSync('src/data/stl.ts', "import type { ApiEntry } from '../types'\n\nexport const apiData: ApiEntry[] = [\n" + out.join(',\n') + '\n]\n', 'utf8')
console.log('Done: wrote ' + out.length + ' entries')
