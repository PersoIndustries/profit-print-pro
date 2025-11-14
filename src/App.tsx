import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Projects from "./pages/Projects";
import Orders from "./pages/Orders";
import Prints from "./pages/Prints";
import CalculatorPage from "./pages/CalculatorPage";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Catalogs from "./pages/Catalogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* Rutas con navegación persistente */}
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
          <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
          <Route path="/orders" element={<AppLayout><Orders /></AppLayout>} />
          <Route path="/prints" element={<AppLayout><Prints /></AppLayout>} />
          <Route path="/calculator" element={<AppLayout><CalculatorPage /></AppLayout>} />
          <Route path="/calculator/:projectId" element={<AppLayout><CalculatorPage /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          <Route path="/catalogs" element={<AppLayout><Catalogs /></AppLayout>} />
          <Route path="/admin" element={<AppLayout><AdminDashboard /></AppLayout>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
