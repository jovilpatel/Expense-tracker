import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Receive from './pages/Receive.jsx';
import ReceiveDetail from './pages/ReceiveDetail.jsx';
import Pay from './pages/Pay.jsx';
import PayDetail from './pages/PayDetail.jsx';
import Reports from './pages/Reports.jsx';
import People from './pages/People.jsx';
import PersonDetail from './pages/PersonDetail.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/receive" element={<Receive />} />
        <Route path="/receive/:id" element={<ReceiveDetail />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/pay/:id" element={<PayDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/people" element={<People />} />
        <Route path="/people/:name" element={<PersonDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}