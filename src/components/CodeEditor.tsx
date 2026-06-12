import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { javascript } from '@codemirror/lang-javascript'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import type { CodeLanguage } from '../types'

const extensions: Record<string, ReturnType<typeof python>> = {
  Python: python(),
  Java: java(),
  'C++': cpp(),
  Go: go(),
  Rust: rust(),
  JavaScript: javascript(),
  TypeScript: javascript({ typescript: true }),
  'C#': java(),
  Swift: rust(),
  Kotlin: java(),
  Ruby: python(),
  PHP: javascript(),
  Scala: java(),
  Dart: javascript(),
}

interface Props {
  code: string
  language: CodeLanguage
  onChange?: (value: string) => void
  editable?: boolean
}

export function CodeEditor({ code, language, onChange, editable = true }: Props) {
  const ext = useMemo(() => [extensions[language] || javascript()], [language])

  return (
    <CodeMirror
      value={code}
      height="min(calc(100vh - 400px), 500px)"
      extensions={ext}
      onChange={onChange}
      editable={editable}
      theme={oneDark}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        autocompletion: true,
      }}
    />
  )
}
