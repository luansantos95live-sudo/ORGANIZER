import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Painel } from './pages/Painel'
import { OsList } from './pages/OsList'
import { RotasPage } from './pages/Rota'
import { Fechamento } from './pages/Fechamento'
import { Faturamento } from './pages/Faturamento'
import { Fichas } from './pages/Fichas'
import { EmailsPage } from './pages/Emails'
import { ConfigPage } from './pages/Config'

// Endereços iguais aos do sistema real (/dashboard/os, /dashboard/rotas, /dashboard/faturamento, /dashboard/fichas,
// /dashboard/configuracoes). Os endereços antigos do laboratório redirecionam.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Painel />} />
          <Route path="os" element={<OsList />} />
          <Route path="os/:id" element={<OsList />} />
          <Route path="rotas" element={<RotasPage />} />
          <Route path="financeiro" element={<Faturamento />} />
          <Route path="financeiro/fechamento" element={<Fechamento />} />
          <Route path="fichas" element={<Fichas />} />
          <Route path="emails" element={<EmailsPage />} />
          <Route path="configuracoes" element={<ConfigPage />} />
          <Route path="faturamento" element={<Navigate to="/financeiro" replace />} />
          <Route path="fechamento" element={<Navigate to="/financeiro/fechamento" replace />} />
          <Route path="rota" element={<Navigate to="/rotas" replace />} />
          <Route path="agenda" element={<Navigate to="/os?visao=kanban" replace />} />
          <Route path="config" element={<Navigate to="/configuracoes" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
