import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ServerList from './pages/ServerList';
import ServerDetail from './pages/ServerDetail';
import Clusters from './pages/Clusters';
import Batches from './pages/Batches';
import FactoryOverview from './pages/FactoryOverview';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers" element={<ServerList />} />
            <Route path="/servers/:id" element={<ServerDetail />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/factory-overview" element={<FactoryOverview />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
