import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { BookOpen, BarChart3, Tags, Settings as SettingsIcon, Github, Search, Target, History, Menu, X } from 'lucide-react'
import { ApiSearch } from './ApiSearch'

const navItems = [
  { to: '/', icon: BarChart3, label: '概览' },
  { to: '/problems', icon: BookOpen, label: '题目' },
  { to: '/tags', icon: Tags, label: '标签' },
  { to: '/review', icon: Target, label: '复习' },
  { to: '/review-history', icon: History, label: '复习历史' },
  { to: '/settings', icon: SettingsIcon, label: '设置' },
]

export function Layout() {
  const [apiSearchOpen, setApiSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setApiSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Desktop sidebar (lg+) */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-zinc-200 bg-white shrink-0">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">L</div>
          <span className="text-lg font-bold text-zinc-900">LeetRev</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-[0.97] ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-100 p-3">
          <a href="https://github.com/200762zzy/LeetRev" target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:bg-zinc-200 active:scale-[0.97]"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className="truncate">GitHub</span>
          </a>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar (tablet/phone only) */}
        <div className="flex lg:hidden h-14 items-center gap-2 border-b border-zinc-200 bg-white px-4 shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="flex items-center justify-center p-3 -ml-1.5 rounded-lg text-zinc-600 active:bg-zinc-100 active:scale-[0.95]">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">L</div>
          <span className="text-base font-bold text-zinc-900">LeetRev</span>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-4 py-4 lg:px-8 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 flex h-full w-64 flex-col border-r border-zinc-200 bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">L</div>
                <span className="text-lg font-bold text-zinc-900">LeetRev</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center p-2 rounded-lg text-zinc-400 active:bg-zinc-100 active:scale-[0.95]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors active:scale-[0.97] ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-zinc-100 p-3">
              <a href="https://github.com/200762zzy/LeetRev" target="_blank" rel="noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:bg-zinc-200 active:scale-[0.97]"
              >
                <Github className="h-5 w-5 shrink-0" />
                GitHub
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* Floating API search button */}
      <button
        onClick={() => setApiSearchOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-90"
        title="API 速查 (Ctrl+Shift+A)"
      >
        <Search className="h-5 w-5" />
      </button>

      <ApiSearch open={apiSearchOpen} onClose={() => setApiSearchOpen(false)} />
    </div>
  )
}