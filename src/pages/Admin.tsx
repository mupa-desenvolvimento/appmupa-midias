import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Monitor, 
  Database, 
  Settings, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Activity,
  Globe,
  Shield,
  BarChart3,
  Clock,
  Wifi,
  HardDrive,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Film,
  Home,
  Database as DatabaseIcon,
  BarChart,
  Users as UsersIcon,
  Bell
} from 'lucide-react';

interface SystemStats {
  totalEmpresas: number;
  totalGrupos: number;
  totalDispositivos: number;
  totalMidias: number;
  ultimaSincronizacao: string;
  statusSistema: 'online' | 'offline' | 'warning';
}

interface Empresa {
  _id: string;
  nome: string;
  cnpj: string;
  status: 'ativo' | 'inativo';
  grupos: number;
  dispositivos: number;
  createdAt: string;
}

interface Grupo {
  _id: string;
  nome: string;
  empresa: string;
  dispositivos: number;
  midias: number;
  status: 'ativo' | 'inativo';
  createdAt: string;
}

interface Dispositivo {
  _id: string;
  nome: string;
  codigo: string;
  grupo: string;
  empresa: string;
  status: 'online' | 'offline' | 'manutencao';
  ultimaAtividade: string;
  ip: string;
  versao: string;
}

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalEmpresas: 0,
    totalGrupos: 0,
    totalDispositivos: 0,
    totalMidias: 0,
    ultimaSincronizacao: '',
    statusSistema: 'online'
  });
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [midiasBanco, setMidiasBanco] = useState<any[]>([]);
  const [isLoadingMidias, setIsLoadingMidias] = useState(false);
  const [buscaMidia, setBuscaMidia] = useState('');
  const [paginaMidia, setPaginaMidia] = useState(1);
  const [totalMidias, setTotalMidias] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const itensPorPagina = 50;

  // Buscar dados reais do backend
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Buscar estatísticas
        const statsRes = await fetch('http://localhost:3000/stats');
        const statsData = await statsRes.json();
        // Buscar status
        const statusRes = await fetch('http://localhost:3000/status');
        const statusData = await statusRes.json();
        setSystemStats({
          totalEmpresas: 0, // Atualize se criar endpoint de empresas
          totalGrupos: 0,   // Atualize se criar endpoint de grupos
          totalDispositivos: 0, // Atualize se criar endpoint de dispositivos
          totalMidias: statsData.total_midias || 0,
          ultimaSincronizacao: statsData.ultima_sincronizacao || '',
          statusSistema: statusData.status || 'online',
        });
      } catch (err: any) {
        setError('Erro ao buscar dados do backend: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Função para carregar mídias
  const carregarMidias = useCallback(async (pagina: number) => {
    setIsLoadingMidias(true);
    try {
      const response = await fetch(`http://localhost:3000/todas-midias?page=${pagina}&limit=${itensPorPagina}`);
      const data = await response.json();
      
      if (data.success) {
        setMidiasBanco(data.midias);
        setTotalMidias(data.total);
        setTotalPaginas(data.total_pages);
      } else {
        console.error('Erro ao carregar mídias:', data.error);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
    } finally {
      setIsLoadingMidias(false);
    }
  }, []);

  // Efeito para carregar mídias quando a página mudar
  useEffect(() => {
    if (activeTab === 'banco') {
      carregarMidias(paginaMidia);
    }
  }, [activeTab, paginaMidia, carregarMidias]);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      // Simular sincronização
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Sincronização realizada');
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'ativo':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
      case 'inativo':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'manutencao':
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: 'bg-green-100 text-green-800',
      ativo: 'bg-green-100 text-green-800',
      offline: 'bg-red-100 text-red-800',
      inativo: 'bg-red-100 text-red-800',
      manutencao: 'bg-yellow-100 text-yellow-800',
      warning: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.cnpj.includes(searchTerm)
  );

  const filteredGrupos = grupos.filter(grupo =>
    grupo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grupo.empresa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDispositivos = dispositivos.filter(dispositivo =>
    dispositivo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispositivo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispositivo.ip.includes(searchTerm)
  );

  return (
    <div className="flex h-screen w-screen bg-[#f7f8fa]">
      {/* Sidebar escura fixa */}
      <aside className="w-64 min-w-[16rem] bg-[#111827] text-white flex flex-col border-r border-gray-200">
        <div className="flex items-center justify-center h-20 border-b border-gray-800">
          <img
            src="https://3ae4eb7cd71d409c5fc6c7861ea69db9.cdn.bubble.io/f1673900178083x912413083967604100/Untitled-1.svg"
            alt="Logo Mupa"
            className="h-12 max-h-12 w-auto"
          />
        </div>
        <nav className="flex-1 py-6 px-2 space-y-1">
          <SidebarButton icon={<BarChart3 />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarButton icon={<Building2 />} label="Empresas" active={activeTab === 'empresas'} onClick={() => setActiveTab('empresas')} />
          <SidebarButton icon={<Users />} label="Grupos" active={activeTab === 'grupos'} onClick={() => setActiveTab('grupos')} />
          <SidebarButton icon={<Monitor />} label="Dispositivos" active={activeTab === 'dispositivos'} onClick={() => setActiveTab('dispositivos')} />
          <SidebarButton icon={<Database />} label="Mídias" active={activeTab === 'midias'} onClick={() => setActiveTab('midias')} />
          <SidebarButton icon={<Settings />} label="Configurações" active={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')} />
          <SidebarButton icon={<Database />} label="Banco de Dados" active={activeTab === 'banco'} onClick={() => setActiveTab('banco')} />
        </nav>
        <div className="mt-auto p-4 border-t border-gray-800 text-xs text-gray-400">
          Sistema v1.0<br />© 2024 Mupa
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header branco fino no topo */}
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <span className="text-gray-400 text-sm hidden md:inline">Bem-vindo de volta, Adriano Antunes. Aqui está um resumo das informações do seu painel.</span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleSync} disabled={isLoading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
            </Button>
            <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              <Globe className="w-4 h-4 mr-1" /> Sistema Online
            </Badge>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-gray-700">
              <span>Adriano Usuário</span>
              <span className="bg-gray-300 rounded-full w-7 h-7 flex items-center justify-center">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0 1 13 0" /></svg>
              </span>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-y-auto px-8 py-6 w-full">
          {/* Barra de busca */}
          <div className="mb-8">
            <div className="relative w-full max-w-2xl">
              <Input
                type="text"
                placeholder="Buscar empresas, grupos, dispositivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base bg-white border border-gray-300 shadow-sm rounded-lg"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Cards de estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                <StatCard label="Total Empresas" value={systemStats.totalEmpresas} icon={<Building2 className="w-7 h-7 text-blue-500" />} />
                <StatCard label="Total Grupos" value={systemStats.totalGrupos} icon={<Users className="w-7 h-7 text-green-500" />} />
                <StatCard label="Dispositivos" value={systemStats.totalDispositivos} icon={<Monitor className="w-7 h-7 text-purple-500" />} />
                <StatCard label="Mídias" value={systemStats.totalMidias} icon={<Database className="w-7 h-7 text-orange-500" />} />
              </div>

              {/* Status do Sistema */}
              <Card className="w-full rounded-2xl shadow border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-xl">
                    <Activity className="w-6 h-6" />
                    <span>Status do Sistema</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <StatusItem label="Conectividade" value="Online" icon={<Wifi className="w-6 h-6 text-green-500" />} />
                    <StatusItem label="Banco de Dados" value="Conectado" icon={<HardDrive className="w-6 h-6 text-blue-500" />} />
                    <StatusItem label="Última Sincronização" value={new Date(systemStats.ultimaSincronizacao).toLocaleString('pt-BR')} icon={<Clock className="w-6 h-6 text-purple-500" />} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empresas Tab */}
          {activeTab === 'empresas' && (
            <div className="space-y-6 w-full">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Empresas</h2>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Nova Empresa</span>
                </Button>
              </div>

              <div className="grid gap-4 w-full">
                {filteredEmpresas.map((empresa) => (
                  <Card key={empresa._id} className="hover:shadow-md transition-shadow w-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{empresa.nome}</h3>
                            <p className="text-sm text-gray-500">{empresa.cnpj}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600">{empresa.grupos} grupos</span>
                              <span className="text-sm text-gray-600">{empresa.dispositivos} dispositivos</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(empresa.status)}
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Grupos Tab */}
          {activeTab === 'grupos' && (
            <div className="space-y-6 w-full">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Grupos</h2>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Novo Grupo</span>
                </Button>
              </div>

              <div className="grid gap-4 w-full">
                {filteredGrupos.map((grupo) => (
                  <Card key={grupo._id} className="hover:shadow-md transition-shadow w-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{grupo.nome}</h3>
                            <p className="text-sm text-gray-500">{grupo.empresa}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600">{grupo.dispositivos} dispositivos</span>
                              <span className="text-sm text-gray-600">{grupo.midias} mídias</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(grupo.status)}
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Dispositivos Tab */}
          {activeTab === 'dispositivos' && (
            <div className="space-y-6 w-full">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Dispositivos</h2>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Novo Dispositivo</span>
                </Button>
              </div>

              <div className="grid gap-4 w-full">
                {filteredDispositivos.map((dispositivo) => (
                  <Card key={dispositivo._id} className="hover:shadow-md transition-shadow w-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Monitor className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{dispositivo.nome}</h3>
                            <p className="text-sm text-gray-500">Código: {dispositivo.codigo}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600">{dispositivo.grupo}</span>
                              <span className="text-sm text-gray-600">IP: {dispositivo.ip}</span>
                              <span className="text-sm text-gray-600">v{dispositivo.versao}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(dispositivo.status)}
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Mídias Tab */}
          {activeTab === 'midias' && (
            <div className="space-y-6 w-full">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-xl font-semibold text-gray-900">Mídias</h2>
              </div>

              {/* API Status Card */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Status da API de Mídias</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {/* Última Sincronização */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Última Sincronização</h3>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {systemStats.ultimaSincronizacao 
                            ? new Date(systemStats.ultimaSincronizacao).toLocaleString('pt-BR')
                            : 'Nunca sincronizado'
                          }
                        </span>
                      </div>
                      {systemStats.ultimaSincronizacao && (
                        <p className="text-xs text-gray-500">
                          Há {Math.floor((Date.now() - new Date(systemStats.ultimaSincronizacao).getTime()) / (1000 * 60))} minutos
                        </p>
                      )}
                    </div>

                    {/* Próxima Sincronização */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Próxima Sincronização</h3>
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">
                          {systemStats.ultimaSincronizacao 
                            ? new Date(new Date(systemStats.ultimaSincronizacao).getTime() + 60 * 60 * 1000).toLocaleString('pt-BR')
                            : 'Em 1 hora'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Intervalo: 1 hora
                      </p>
                    </div>

                    {/* Status da API */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Status da API</h3>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${systemStats.statusSistema === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-600 capitalize">
                          {systemStats.statusSistema === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        https://mupa.app/api/1.1/wf/get_medias_all
                      </p>
                    </div>
                  </div>

                  {/* Botão de Sincronização Manual */}
                  <div className="mt-6 pt-4 border-t border-gray-200 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h4 className="font-medium text-gray-900">Sincronização Manual</h4>
                        <p className="text-sm text-gray-500">
                          Force uma nova requisição para a API de mídias
                        </p>
                      </div>
                      <Button 
                        onClick={handleSync} 
                        disabled={isLoading}
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas de Mídias */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Estatísticas de Mídias</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    <div className="text-center p-4 bg-blue-50 rounded-lg w-full">
                      <div className="text-2xl font-bold text-blue-600">{systemStats.totalMidias}</div>
                      <div className="text-sm text-gray-600">Total de Mídias</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg w-full">
                      <div className="text-2xl font-bold text-green-600">45</div>
                      <div className="text-sm text-gray-600">Mídias Ativas</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg w-full">
                      <div className="text-2xl font-bold text-purple-600">12</div>
                      <div className="text-sm text-gray-600">Grupos com Mídias</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg w-full">
                      <div className="text-2xl font-bold text-orange-600">2.3GB</div>
                      <div className="text-sm text-gray-600">Espaço Utilizado</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações da API */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span>Informações da API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 w-full">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Endpoint</h4>
                      <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm w-full">
                        GET https://mupa.app/api/1.1/wf/get_medias_all
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Headers</h4>
                      <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm w-full">
                        Authorization: Token 9c264e50ddb95a215b446412a3b42b58
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div className="w-full">
                        <h4 className="font-medium text-gray-900 mb-2">Última Resposta</h4>
                        <div className="bg-gray-100 p-3 rounded-lg text-sm w-full">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-600">200 OK</span>
                          </div>
                          <p className="text-gray-600 mt-1">
                            {systemStats.totalMidias} mídias recebidas
                          </p>
                        </div>
                      </div>

                      <div className="w-full">
                        <h4 className="font-medium text-gray-900 mb-2">Tempo de Resposta</h4>
                        <div className="bg-gray-100 p-3 rounded-lg text-sm w-full">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="text-blue-600">~850ms</span>
                          </div>
                          <p className="text-gray-600 mt-1">
                            Média das últimas requisições
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logs de Sincronização */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Logs de Sincronização</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto w-full">
                    <div className="flex items-center space-x-3 p-2 bg-green-50 rounded w-full">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Sincronização bem-sucedida</p>
                        <p className="text-xs text-green-600">15/01/2024 10:30:00 - 892 mídias atualizadas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded w-full">
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">Sincronização automática iniciada</p>
                        <p className="text-xs text-blue-600">15/01/2024 09:30:00 - Execução agendada</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-2 bg-green-50 rounded w-full">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Sincronização bem-sucedida</p>
                        <p className="text-xs text-green-600">15/01/2024 08:30:00 - 892 mídias atualizadas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-2 bg-yellow-50 rounded w-full">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">Tentativa de reconexão</p>
                        <p className="text-xs text-yellow-600">15/01/2024 07:30:00 - Timeout na requisição</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Configurações Tab */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Configurações do Sistema</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Configurações de Segurança</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token da API
                      </label>
                      <Input 
                        type="password" 
                        value="9c264e50ddb95a215b446412a3b42b58"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL da API
                      </label>
                      <Input 
                        value="https://mupa.app/api/1.1/wf/get_medias_all"
                        readOnly
                      />
                    </div>
                    <Button className="w-full">
                      Atualizar Configurações
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Sincronização</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Intervalo de Sincronização
                      </label>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="1">1 hora</option>
                        <option value="2">2 horas</option>
                        <option value="6">6 horas</option>
                        <option value="12">12 horas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Última Sincronização
                      </label>
                      <p className="text-sm text-gray-600">
                        {new Date(systemStats.ultimaSincronizacao).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleSync}>
                      Sincronizar Agora
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Banco de Dados Tab */}
          {activeTab === 'banco' && (
            <div className="space-y-8">
              {/* Header com Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard 
                  label="Total de Mídias" 
                  value={midiasBanco.length} 
                  icon={<Database className="w-7 h-7 text-blue-500" />} 
                />
                <StatCard 
                  label="Mídias Ativas" 
                  value={midiasBanco.filter(m => m.ativado).length} 
                  icon={<CheckCircle className="w-7 h-7 text-green-500" />} 
                />
                <StatCard 
                  label="Grupos Únicos" 
                  value={new Set(midiasBanco.map(m => m.grupo_lojas)).size} 
                  icon={<Users className="w-7 h-7 text-purple-500" />} 
                />
                <StatCard 
                  label="Tipos de Mídia" 
                  value={new Set(midiasBanco.map(m => m.tipo)).size} 
                  icon={<Film className="w-7 h-7 text-orange-500" />} 
                />
              </div>

              {/* Cabeçalho e Busca */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Banco de Dados - Todas as Mídias</h2>
                  <p className="text-sm text-gray-500">
                    Total de {totalMidias} mídias no banco
                  </p>
                </div>
                <Input
                  placeholder="Buscar por nome, grupo, tipo..."
                  value={buscaMidia}
                  onChange={e => { setBuscaMidia(e.target.value); setPaginaMidia(1); }}
                  className="w-80 bg-white border border-gray-300 shadow-sm rounded-lg"
                />
              </div>

              {/* Tabela */}
              <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
                {isLoadingMidias ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                    <span className="text-gray-500">Carregando mídias...</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID da Mídia
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome do Arquivo
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Grupo
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Período de Exibição
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {midiasBanco
                            .filter(m =>
                              (m.nome?.toLowerCase().includes(buscaMidia.toLowerCase()) ||
                              m.grupo_lojas?.toLowerCase().includes(buscaMidia.toLowerCase()) ||
                              m.tipo?.toLowerCase().includes(buscaMidia.toLowerCase()))
                            )
                            .slice((paginaMidia-1)*itensPorPagina, paginaMidia*itensPorPagina)
                            .map(m => (
                              <tr key={m._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="text-xs font-mono text-gray-500 max-w-[150px] truncate" title={m._id}>
                                      {m._id}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{m.nome}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge className={
                                    m.tipo?.toLowerCase().includes('mp4') ? 'bg-purple-100 text-purple-800' :
                                    m.tipo?.toLowerCase().includes('jpg') || m.tipo?.toLowerCase().includes('png') ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {m.tipo || 'Desconhecido'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{m.grupo_lojas || '-'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge className={m.ativado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {m.ativado ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">
                                    {new Date(m.inicia).toLocaleString('pt-BR')} até<br/>
                                    {new Date(m.final).toLocaleString('pt-BR')}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <Button 
                          disabled={paginaMidia === 1} 
                          onClick={() => setPaginaMidia(paginaMidia-1)}
                          variant="outline"
                        >
                          Anterior
                        </Button>
                        <Button
                          disabled={paginaMidia >= totalPaginas}
                          onClick={() => setPaginaMidia(paginaMidia+1)}
                          variant="outline"
                        >
                          Próxima
                        </Button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Mostrando <span className="font-medium">{((paginaMidia-1)*itensPorPagina)+1}</span> até{' '}
                            <span className="font-medium">
                              {Math.min(paginaMidia*itensPorPagina, totalMidias)}
                            </span> de{' '}
                            <span className="font-medium">{totalMidias}</span> resultados
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <Button
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                              disabled={paginaMidia === 1}
                              onClick={() => setPaginaMidia(paginaMidia-1)}
                              variant="outline"
                            >
                              Anterior
                            </Button>
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              Página {paginaMidia} de {totalPaginas}
                            </span>
                            <Button
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                              disabled={paginaMidia >= totalPaginas}
                              onClick={() => setPaginaMidia(paginaMidia+1)}
                              variant="outline"
                            >
                              Próxima
                            </Button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Componente StatCard
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="bg-gray-50 p-3 rounded-lg">
        {icon}
      </div>
    </div>
  </div>
);

// Componente SidebarButton
interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      active 
        ? 'bg-blue-50 text-blue-700' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

// Item de status
function StatusItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl flex flex-col items-center justify-center p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-lg font-semibold text-gray-800">{label}</span></div>
      <div className="text-gray-600 text-base">{value}</div>
    </div>
  );
}

export default AdminPage; 