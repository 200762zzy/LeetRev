import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Welcome } from './pages/Welcome'
import { Problems } from './pages/Problems'
import { ProblemForm } from './pages/ProblemForm'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/new" element={<ProblemForm />} />
        <Route path="/problems/:id/edit" element={<ProblemForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
