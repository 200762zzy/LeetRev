import { readFileSync, writeFileSync } from 'fs'

function q(s) { return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" }
function qa(arr) { return '[' + arr.map(q).join(', ') + ']' }

function entry(o) {
  let lines = ['  {']
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue
    let val
    if (Array.isArray(v)) {
      if (typeof v[0] === 'string') {
        val = qa(v)
      } else {
        val = '[' + v.map(ex => {
          let s = '{'
          if (ex.title) s += 'title: ' + q(ex.title) + ', '
          s += 'code: ' + q(ex.code) + '}'
          return s
        }).join(', ') + ']'
      }
    } else if (typeof v === 'string') {
      val = q(v)
    } else {
      val = String(v)
    }
    lines.push('    ' + k + ': ' + val + ',')
  }
  let last = lines.pop()
  lines.push(last.replace(/,$/, ''))
  lines.push('  }')
  return lines.join('\n')
}

const entries = [
  // === Java ===
  { id: 'arraylist', name: 'ArrayList', category: '集合类', language: 'java', full_name: 'java.util.ArrayList<E>', signature: 'ArrayList<E>', signatures: ['ArrayList<E>'], description: '动态数组，连续存储，随机访问 O(1)，尾部插入均摊 O(1)。中间插入/删除 O(n)。', example: 'ArrayList<Integer> list = new ArrayList<>();\nlist.add(1);\nlist.get(0);', examples: [{ title: '基本操作', code: 'ArrayList<String> list = new ArrayList<>();\nlist.add("a");\nlist.add(0, "b");\nlist.remove(0);\nlist.contains("a");\nlist.size();' }], complexity: '随机访问 O(1), 尾部插入均摊 O(1)', notes: 'ArrayList 是 List 接口的可变大小数组实现。ensureCapacity 可预分配。', leetcode_tips: 'Arrays.asList() 返回固定大小列表，不能 add/remove。List.of() (Java 9+) 返回不可变列表。', see_also: ['linkedlist', 'arrays'] },
  { id: 'linkedlist', name: 'LinkedList', category: '集合类', language: 'java', full_name: 'java.util.LinkedList<E>', signature: 'LinkedList<E>', signatures: ['LinkedList<E>'], description: '双向链表，实现 List 和 Deque 接口。头尾操作 O(1)，中间插入 O(n)。', example: 'LinkedList<String> list = new LinkedList<>();\nlist.addFirst("a");\nlist.addLast("b");', examples: [{ title: '双端操作', code: 'LinkedList<Integer> dq = new LinkedList<>();\ndq.addFirst(1);\ndq.addLast(2);\ndq.peekFirst();\ndq.pollLast();' }], complexity: '头尾 O(1), 随机访问 O(n)', notes: '可作 List、Queue、Deque 使用。注意随机访问性能较差。', leetcode_tips: '实现 Deque 接口，可替代 Stack。推荐用 LinkedList 作为队列实现。', see_also: ['arraylist', 'arraydeque'] },
  { id: 'hashmap', name: 'HashMap', category: '集合类', language: 'java', full_name: 'java.util.HashMap<K, V>', signature: 'HashMap<K, V>', signatures: ['HashMap<K, V>'], description: '基于哈希表的 Map 实现，允许 key/value 为 null。平均 O(1) 查找。', example: 'HashMap<String, Integer> map = new HashMap<>();\nmap.put("a", 1);\nint v = map.get("a");', examples: [{ title: '计数用法', code: 'HashMap<Character, Integer> freq = new HashMap<>();\nfor (char c : s.toCharArray()) {\n  freq.put(c, freq.getOrDefault(c, 0) + 1);\n}' }], complexity: '平均 O(1), 最坏 O(n)', notes: '初始容量和负载因子影响性能。Java 8+ 链表长度 >8 转红黑树。', leetcode_tips: '两数之和、滑动窗口计数、频次统计等的默认选择。', see_also: ['treemap', 'linkedhashmap', 'hashset'] },
  { id: 'treemap', name: 'TreeMap', category: '集合类', language: 'java', full_name: 'java.util.TreeMap<K, V>', signature: 'TreeMap<K, V>', signatures: ['TreeMap<K, V>'], description: '基于红黑树的有序 Map，按键自然序或 Comparator 排序。O(log n) 操作。', example: 'TreeMap<Integer, String> map = new TreeMap<>();\nmap.put(1, "a");\nmap.firstKey();', examples: [{ title: '范围操作', code: 'TreeMap<Integer, String> tm = new TreeMap<>();\ntm.put(1,"a"); tm.put(3,"c"); tm.put(2,"b");\ntm.firstKey(); // 1\ntm.lastKey(); // 3\ntm.ceilingKey(2); // 2\ntm.floorKey(2); // 2' }], complexity: 'O(log n)', notes: 'NavigableMap 和 SortedMap 接口的实现。支持 range view。', leetcode_tips: '需要有序键、floor/ceiling 操作时用 TreeMap。', see_also: ['hashmap', 'linkedhashmap', 'treeset'] },
  { id: 'hashset', name: 'HashSet', category: '集合类', language: 'java', full_name: 'java.util.HashSet<E>', signature: 'HashSet<E>', signatures: ['HashSet<E>'], description: '基于 HashMap 的 Set 实现，不允许重复元素。平均 O(1) 操作。', example: 'HashSet<Integer> set = new HashSet<>();\nset.add(1);\nset.contains(1);', examples: [{ title: '去重用法', code: 'HashSet<Integer> seen = new HashSet<>();\nfor (int x : nums) {\n  if (seen.contains(x)) return true;\n  seen.add(x);\n}' }], complexity: '平均 O(1)', notes: '元素无序。LinkedHashSet 保持插入顺序，TreeSet 保持排序。', leetcode_tips: '判断元素是否出现过、去重的首选。', see_also: ['treeset', 'linkedhashset', 'hashmap'] },
  { id: 'treeset', name: 'TreeSet', category: '集合类', language: 'java', full_name: 'java.util.TreeSet<E>', signature: 'TreeSet<E>', signatures: ['TreeSet<E>'], description: '基于 TreeMap 的有序 Set，红黑树实现。O(log n) 操作。', example: 'TreeSet<Integer> ts = new TreeSet<>();\nts.add(3); ts.add(1); ts.add(2);\n// order: 1, 2, 3', examples: [{ title: '范围查询', code: 'TreeSet<Integer> ts = new TreeSet<>(Set.of(1,3,5,7));\nts.ceiling(4); // 5\nts.floor(4); // 3\nts.higher(5); // 7\nts.lower(5); // 3' }], complexity: 'O(log n)', notes: 'NavigableSet 接口的实现。ceiling/floor/higher/lower 方法很实用。', leetcode_tips: '有序集合场景，如滑动窗口中的值范围维护。', see_also: ['hashset', 'treemap', 'linkedhashset'] },
  { id: 'stringbuilder', name: 'StringBuilder', category: '字符串', language: 'java', full_name: 'java.lang.StringBuilder', signature: 'StringBuilder', signatures: ['StringBuilder'], description: '可变字符串，适合频繁拼接操作(append/concat)，非线程安全。', example: 'StringBuilder sb = new StringBuilder();\nsb.append("a");\nsb.append("b");\nsb.toString();', examples: [{ title: '字符串拼接', code: 'StringBuilder sb = new StringBuilder();\nfor (int i = 0; i < 100; i++) sb.append(i);\nString s = sb.toString();\nsb.reverse();\nsb.deleteCharAt(0);\nsb.insert(0, "x");' }], complexity: 'append 均摊 O(1)', notes: 'StringBuffer 是线程安全版但更慢。StringBuilder 非线程安全，性能更好。', leetcode_tips: '循环拼接字符串务必用 StringBuilder，避免 O(n²)。reverse() 方便字符串反转。', see_also: ['string'] },
  { id: 'arrays', name: 'Arrays', category: '工具类', language: 'java', full_name: 'java.util.Arrays', signature: 'Arrays', signatures: ['java.util.Arrays'], description: '数组操作工具类，提供排序、二分查找、填充、拷贝、转 List 等静态方法。', example: 'int[] arr = {3,1,2};\nArrays.sort(arr);\nint i = Arrays.binarySearch(arr, 2);', examples: [{ title: '常用方法', code: 'int[] a = {3,1,2};\nArrays.sort(a);\nArrays.sort(a, 0, 2);\nint idx = Arrays.binarySearch(a, 2);\nint[] copy = Arrays.copyOf(a, 5);\nArrays.fill(a, 0);\nString s = Arrays.toString(a);\nList<Integer> list = Arrays.asList(1,2,3);' }, { title: '二维排序', code: 'int[][] intervals = {{1,3},{2,6},{8,10}};\nArrays.sort(intervals, (a,b) -> a[0] - b[0]);' }], complexity: 'sort O(n log n), binarySearch O(log n)', notes: 'binarySearch 需要先排序。asList 返回固定大小列表，不支持 add/remove。', leetcode_tips: '数组排序、拷贝、toString 调试时非常常用。', see_also: ['collections', 'arraylist'] },
  { id: 'collections', name: 'Collections', category: '工具类', language: 'java', full_name: 'java.util.Collections', signature: 'Collections', signatures: ['java.util.Collections'], description: '集合工具类，提供排序、反转、洗牌、不可变包装等静态方法。', example: 'List<Integer> list = new ArrayList<>(Arrays.asList(3,1,2));\nCollections.sort(list);', examples: [{ title: '常用方法', code: 'List<Integer> list = new ArrayList<>(List.of(3,1,2));\nCollections.sort(list);\nCollections.reverse(list);\nCollections.shuffle(list);\nint mx = Collections.max(list);\nint mn = Collections.min(list);\nCollections.frequency(list, 1);\nCollections.swap(list, 0, 1);' }], complexity: 'sort O(n log n)', notes: 'Collections.sort 在 Java 8+ 使用 TimSort（稳定排序）。', leetcode_tips: 'Collections.reverse 反转 List。Collections.singletonList 创建单元素列表。', see_also: ['arrays', 'comparator'] },
  { id: 'optional_java', name: 'Optional', category: '工具类', language: 'java', full_name: 'java.util.Optional<T>', signature: 'Optional<T>', signatures: ['Optional<T> (Java 8+)'], description: '容器对象，可能包含也可能不包含非 null 值。函数式处理空值。', example: 'Optional<String> opt = Optional.of("hello");\nopt.ifPresent(s -> System.out.println(s));', examples: [{ title: '函数式用法', code: 'Optional<String> opt = Optional.ofNullable(getValue());\nString result = opt\n  .filter(s -> s.length() > 3)\n  .map(String::toUpperCase)\n  .orElse("default");' }], complexity: '', notes: '不要用 Optional 作为字段类型或方法参数。orElse 和 orElseGet 的区别：orElse 总是求值。', leetcode_tips: '避免返回 null，用 Optional 表示可能缺失的值。', see_also: ['stream', 'optional'] },
  { id: 'stream', name: 'Stream', category: '函数式', language: 'java', full_name: 'java.util.stream.Stream<T>', signature: 'Stream<T>', signatures: ['Stream<T> (Java 8+)', 'IntStream / LongStream / DoubleStream'], description: '支持函数式操作（map/filter/reduce）的元素序列。不存储数据，可链式调用。', example: 'List<Integer> nums = Arrays.asList(1,2,3,4);\nint sum = nums.stream().filter(n -> n % 2 == 0).mapToInt(n -> n).sum();', examples: [{ title: '常用操作', code: 'list.stream()\n  .filter(x -> x > 0)\n  .map(String::valueOf)\n  .sorted()\n  .collect(Collectors.toList());' }, { title: 'IntStream 范围', code: 'IntStream.range(0, 10).forEach(System.out::println);\nIntStream.rangeClosed(1, 5).sum(); // 15' }], complexity: '', notes: 'Stream 是惰性求值，终端操作执行后才计算。不可重用。parallelStream 并行处理。', leetcode_tips: '数组/列表的快速过滤、映射、统计。Collectors.groupingBy 分组很实用。', see_also: ['collectors', 'optional_java'] },
  { id: 'collectors', name: 'Collectors', category: '函数式', language: 'java', full_name: 'java.util.stream.Collectors', signature: 'Collectors', signatures: ['java.util.stream.Collectors (Java 8+)'], description: 'Stream 的终端收集工具，将流元素累积到 List/Set/Map 等容器。', example: 'List<String> list = stream.collect(Collectors.toList());', examples: [{ title: '分组', code: 'Map<Integer, List<String>> byLen = strings.stream()\n  .collect(Collectors.groupingBy(String::length));' }, { title: 'joining', code: 'String s = list.stream().collect(Collectors.joining(", "));' }], complexity: '', notes: 'toMap 需处理 key 冲突。groupingBy 默认返回 HashMap。', leetcode_tips: 'groupingBy 按条件分组，partitioningBy 二分分区，joining 拼接字符串。', see_also: ['stream', 'arrays'] },
  { id: 'priorityqueue_java', name: 'PriorityQueue', category: '队列', language: 'java', full_name: 'java.util.PriorityQueue<E>', signature: 'PriorityQueue<E>', signatures: ['PriorityQueue<E>'], description: '基于最小堆（默认）的优先级队列。支持 Comparator 自定义排序。', example: 'PriorityQueue<Integer> pq = new PriorityQueue<>();\npq.add(3);\npq.peek();\npq.poll();', examples: [{ title: '最大堆', code: 'PriorityQueue<Integer> maxPq = new PriorityQueue<>(Collections.reverseOrder());\nmaxPq.add(1); maxPq.add(3); maxPq.add(2);' }, { title: '自定义优先级', code: 'PriorityQueue<int[]> pq = new PriorityQueue<>((a,b) -> a[0] - a[1]);\npq.add(new int[]{5,1});' }], complexity: 'offer/poll O(log n), peek O(1)', notes: '迭代器不保证顺序。默认最小堆（小的先出队）。', leetcode_tips: 'Top K、合并 K 个有序链表、Dijkstra 算法。', see_also: ['collections', 'arrays'] },
  { id: 'arraydeque', name: 'ArrayDeque', category: '队列', language: 'java', full_name: 'java.util.ArrayDeque<E>', signature: 'ArrayDeque<E>', signatures: ['ArrayDeque<E>'], description: '可变大小双端队列，可作栈或队列使用。比 Stack 和 LinkedList 更高效。', example: 'ArrayDeque<Integer> stack = new ArrayDeque<>();\nstack.push(1);\nstack.pop();', examples: [{ title: '栈', code: 'ArrayDeque<String> stack = new ArrayDeque<>();\nstack.push("a"); stack.push("b");\nstack.pop(); // "b"' }, { title: '队列', code: 'ArrayDeque<Integer> q = new ArrayDeque<>();\nq.offer(1); q.offer(2);\nq.poll(); // 1' }], complexity: 'O(1) 所有操作', notes: 'ArrayDeque 比 Stack（遗留类）更快。不允许多个 null 元素。', leetcode_tips: '栈操作推荐用 ArrayDeque 替代 Stack。滑动窗口最大值用 ArrayDeque 存下标。', see_also: ['linkedlist', 'stack'] },
  { id: 'comparator', name: 'Comparator', category: '工具类', language: 'java', full_name: 'java.util.Comparator<T>', signature: 'Comparator<T>', signatures: ['Comparator<T>'], description: '比较函数接口，定义对象排序规则。可用 lambda 或方法引用实现。', example: 'Comparator<Integer> cmp = (a, b) -> b - a; // 降序', examples: [{ title: '链式比较', code: 'Comparator<Person> cmp = Comparator\n  .comparing(Person::getLastName)\n  .thenComparing(Person::getFirstName);\nCollections.sort(people, cmp);' }], returns: 'int：负/零/正', complexity: '', notes: 'compare(a,b) 返回负值表示 a < b。必须满足传递性、反对称性。', leetcode_tips: '自定义排序规则时大量使用。comparingInt 避免自动装箱。', see_also: ['collections', 'arrays', 'priorityqueue_java'] },
]

console.log('Java entries:', entries.length)

// Read existing file, remove closing ], append new entries, write back
let data = readFileSync('src/data/stl.ts', 'utf8')
// Remove trailing \n]\n
data = data.replace(/\n\]$/, '')
data += ',\n'
for (const e of entries) data += entry(e) + ',\n'
data += ']\n'
writeFileSync('src/data/stl.ts', data, 'utf8')
console.log('Appended Java entries successfully')
