import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { useAuth } from './lib/auth-context'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import './App.css'
import './components/chrome.css'
import './pages/pages.css'

function Layout() {
  const { loading } = useAuth()

  return (
    <>
      <Header />
      <main>
        {loading ? (
          <div className="loading-screen">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Cargando...</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
