import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Painel } from './pages/Painel'
import { OsList } from './pages/OsList'
import { OsDetail } from './pages/OsDetail'
import { RotaPage } from './pages/Rota'
import { Agenda } from './pages/Agenda'
import { Fechamento } from './pages/Fechamento'
import { ConfigPage } from './pages/Config'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Painel />} />
          <Route path="os" element={<OsList />} />
          <Route path="os/:id" element={<OsDetail />} />
          <Route path="rota" element={<RotaPage />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="fechamento" element={<Fechamento />} />
          <Route path="config" element={<ConfigPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
