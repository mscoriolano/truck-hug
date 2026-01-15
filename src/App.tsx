import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Jornada from "./pages/Jornada";
import Motoristas from "./pages/Motoristas";
import Veiculos from "./pages/Veiculos";
import Manutencoes from "./pages/Manutencoes";
import Pneus from "./pages/Pneus";
import Alertas from "./pages/Alertas";
import Abastecimentos from "./pages/Abastecimentos";
import Gamificacao from "./pages/Gamificacao";
import Viagens from "./pages/Viagens";
import Guia from "./pages/Guia";
import PortalMotorista from "./pages/PortalMotorista";
import GestaoFinanceira from "./pages/GestaoFinanceira";
import Telemetria from "./pages/Telemetria";
import Metas from "./pages/Metas";
import DashboardExecutivo from "./pages/DashboardExecutivo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/jornada" element={<ProtectedRoute><Jornada /></ProtectedRoute>} />
          <Route path="/motoristas" element={<ProtectedRoute><Motoristas /></ProtectedRoute>} />
          <Route path="/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
          <Route path="/manutencoes" element={<ProtectedRoute><Manutencoes /></ProtectedRoute>} />
          <Route path="/pneus" element={<ProtectedRoute><Pneus /></ProtectedRoute>} />
          <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
          <Route path="/abastecimentos" element={<ProtectedRoute><Abastecimentos /></ProtectedRoute>} />
          <Route path="/gamificacao" element={<ProtectedRoute><Gamificacao /></ProtectedRoute>} />
          <Route path="/viagens" element={<ProtectedRoute><Viagens /></ProtectedRoute>} />
          <Route path="/guia" element={<ProtectedRoute><Guia /></ProtectedRoute>} />
          <Route path="/portal-motorista" element={<ProtectedRoute><PortalMotorista /></ProtectedRoute>} />
          <Route path="/gestao-financeira" element={<ProtectedRoute><GestaoFinanceira /></ProtectedRoute>} />
          <Route path="/telemetria" element={<ProtectedRoute><Telemetria /></ProtectedRoute>} />
          <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
          <Route path="/dashboard-executivo" element={<ProtectedRoute><DashboardExecutivo /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
