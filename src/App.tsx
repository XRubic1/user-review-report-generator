import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ReportPage } from './pages/ReportPage'
import { ClientsPage } from './pages/ClientsPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="main">
          <Routes>
            <Route path="/" element={<ReportPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
