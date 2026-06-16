$file = "D:\leec\LeetRev\src\data\stl.ts"

@"
import type { ApiEntry } from '../types'

export const apiData: ApiEntry[] = [
"@ | Set-Content -LiteralPath $file -Encoding UTF8
