import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { ProductSearch } from './components/ProductSearch';
import SystemLogs from "./pages/SystemLogs";
import ConfigTest from "./pages/ConfigTest";
import Admin from "./pages/Admin";
import FirebaseTest from "./pages/FirebaseTest";
import { LogProvider } from "./contexts/LogContext";
import { AudioProvider } from "./contexts/AudioContext";
import AudioTest from "./components/AudioTest";
import KioskApp from './components/KioskApp';
import Index from "./pages/Index";
import Devices from "./pages/Devices";
import "./App.css";
import { DeviceList } from '@/components/DeviceList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import AppMupa from './components/AppMupa';
import Storage from './pages/Storage';
import StorageLoja from './pages/StorageLoja';

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
              <Route path="/" element={<AppMupa />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/product-search" element={<ProductSearch />} />
              <Route path="/audio-test" element={<AudioTest />} />
              <Route path="/logs" element={<SystemLogs />} />
              <Route path="/config-test" element={<ConfigTest />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/firebase-test" element={<FirebaseTest />} />
              <Route path="/storage" element={<Storage />} />
              <Route path="/storage/loja" element={<StorageLoja />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </LogProvider>
  </QueryClientProvider>
);

export default App;
