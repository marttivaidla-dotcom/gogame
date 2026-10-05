import { Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import PlayersPage from './pages/PlayersPage'
import NewGamePage from './pages/NewGamePage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/uus-mang" replace />} />
        <Route path="uus-mang" element={<NewGamePage />} />
        <Route path="ajalugu" element={<HistoryPage />} />
        <Route path="statistika" element={<StatsPage />} />
        <Route path="mangijad" element={<PlayersPage />} />
        <Route path="*" element={<Navigate to="/uus-mang" replace />} />
      </Route>
    </Routes>
  )
}
