import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Welcome } from './pages/Welcome'
import { ReviewSession } from './pages/ReviewSession'
import { Problems } from './pages/Problems'
import { ProblemForm } from './pages/ProblemForm'
import { ProblemDetail } from './pages/ProblemDetail'
import { TagManager } from './pages/TagManager'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/new" element={<ProblemForm />} />
        <Route path="/problems/:id" element={<ProblemDetail />} />
        <Route path="/problems/:id/edit" element={<ProblemForm />} />
        <Route path="/tags" element={<TagManager />} />
        <Route path="/review" element={<ReviewSession />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
