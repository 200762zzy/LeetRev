import { Outlet, NavLink } from 'react-router-dom'
import { BookOpen, BarChart3, Github } from 'lucide-react'

const navItems = [
  { to: '/', icon: BarChart3, label: '概览' },
  { to: '/problems', icon: BookOpen, label: '题目' },
]

export function Layout() {
  return (
    <div className="flex h-screen bg-zinc-50">
      <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            L
          </div>
          <span className="text-lg font-bold text-zinc-900">LeetRev</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-3">
          <a
            href="https://github.com/200762zzy/LeetRev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
