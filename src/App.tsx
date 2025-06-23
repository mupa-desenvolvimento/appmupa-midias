import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ProductSearch } from './components/ProductSearch';
import SystemLogs from "./pages/SystemLogs";
import ConfigTestPage from "./pages/ConfigTest";
import { LogProvider } from "./contexts/LogContext";
import { AudioProvider } from "./contexts/AudioContext";
import AudioTest from "./components/AudioTest";
import "./App.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LogProvider>
      <AudioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product-search" element={<ProductSearch />} />
              <Route path="/audio-test" element={<AudioTest />} />
              <Route path="/logs" element={<SystemLogs />} />
              <Route path="/config-test" element={<ConfigTestPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </LogProvider>
  </QueryClientProvider>
);

export default App;
