import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AuthService, AuthResponse, GroupsResponse } from '@/lib/api/auth';
import { MediaService, MediasResponse } from '@/lib/api/medias';
import { useLog } from '@/contexts/LogContext';

const ConfigTestPage = () => {
  const { addLog, logs } = useLog();
  const [codUser, setCodUser] = useState('1700359013183x959815499017093100');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [codUserResponse, setCodUserResponse] = useState<AuthResponse | null>(null);
  const [groupsResponse, setGroupsResponse] = useState<GroupsResponse | null>(null);
  const [mediasResponse, setMediasResponse] = useState<MediasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestCodUser = async () => {
    setIsLoading(true);
    setError(null);
    setCodUserResponse(null);
    setGroupsResponse(null);
    setMediasResponse(null);
    setEmpresaId(null);
    setSelectedGroupId(null);
    addLog(`Iniciando teste com cod-user: ${codUser}`);

    try {
      const response = await AuthService.postCodUser(codUser);
      setCodUserResponse(response);

      if (response.success && response.data?.response?.['dados-user']?.Empresa) {
        const id = response.data.response['dados-user'].Empresa;
        setEmpresaId(id);
        addLog(`Sucesso! Empresa ID extraído: ${id}`, 'success');
      } else {
        const errorMessage = response.message || 'Resposta da API não contém Empresa ID.';
        setError(errorMessage);
        addLog(`Erro ao extrair Empresa ID: ${errorMessage}`, 'error');
      }
    } catch (err: any) {
      setError(err.message);
      addLog(`Falha na requisição postCodUser: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchGroups = async () => {
    if (!empresaId) {
      const msg = 'Nenhum Empresa ID disponível para buscar grupos.';
      setError(msg);
      addLog(msg, 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGroupsResponse(null);
    setMediasResponse(null);
    addLog(`Buscando grupos para a empresa: ${empresaId}`);

    try {
      const response = await AuthService.getGroups(empresaId);
      setGroupsResponse(response);

      if (response.success) {
        addLog(`Grupos recebidos com sucesso!`, 'success');
      } else {
        const errorMessage = response.message || 'Erro ao buscar grupos.';
        setError(errorMessage);
        addLog(`Erro na busca de grupos: ${errorMessage}`, 'error');
      }
    } catch (err: any) {
      setError(err.message);
      addLog(`Falha na requisição getGroups: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchMedias = async () => {
    if (!selectedGroupId) {
      const msg = 'Nenhum ID de Grupo selecionado.';
      setError(msg);
      addLog(msg, 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMediasResponse(null);
    addLog(`Buscando mídias para o grupo: ${selectedGroupId}`);

    try {
      const response = await MediaService.getMediasByGroupId(selectedGroupId);
      setMediasResponse(response);

      if (response.success) {
        addLog(`Mídias recebidas com sucesso!`, 'success');
      } else {
        const errorMessage = response.message || 'Erro ao buscar mídias.';
        setError(errorMessage);
        addLog(`Erro na busca de mídias: ${errorMessage}`, 'error');
      }
    } catch (err: any) {
      setError(err.message);
      addLog(`Falha na requisição getMedias: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Página de Teste - Fluxo de Configuração</h1>
          <p className="text-sm text-gray-500">Teste cada etapa da configuração do dispositivo de forma isolada.</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="space-y-6">
            {/* Etapa 1: Testar Código do Usuário */}
            <Card>
              <CardHeader>
                <CardTitle>Etapa 1: Testar Código do Usuário</CardTitle>
                <CardDescription>Insira o código do usuário para validar e obter o ID da empresa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <Label htmlFor="cod-user">Código do Usuário</Label>
                    <Input 
                      id="cod-user"
                      type="password"
                      value={codUser}
                      onChange={(e) => setCodUser(e.target.value)}
                      placeholder="Ex: seu-codigo-aqui"
                      disabled={isLoading}
                    />
                  </div>
                  <Button onClick={handleTestCodUser} disabled={isLoading || !codUser}>
                    {isLoading ? 'Testando...' : 'Testar Código'}
                  </Button>
                </div>
                {codUserResponse && (
                  <div className="mt-4 p-2 bg-gray-100 rounded">
                    <h4 className="font-semibold">Resposta da API:</h4>
                    <pre className="text-sm overflow-x-auto">{JSON.stringify(codUserResponse, null, 2)}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Etapa 2: Buscar Grupos */}
            <Card>
              <CardHeader>
                <CardTitle>Etapa 2: Buscar Grupos</CardTitle>
                <CardDescription>Use o ID da empresa obtido na etapa anterior para buscar os grupos disponíveis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>ID da Empresa: <span className="font-mono bg-gray-100 p-1 rounded">{empresaId || 'Aguardando Etapa 1...'}</span></p>
                <Button onClick={handleFetchGroups} disabled={isLoading || !empresaId}>
                  {isLoading ? 'Buscando...' : 'Buscar Grupos'}
                </Button>
                {groupsResponse?.success && groupsResponse.data?.response?.grupos && (
                   <div className="mt-4 p-2 bg-gray-100 rounded">
                    <h4 className="font-semibold">Grupos Encontrados:</h4>
                    <div className="flex flex-col gap-2 mt-2">
                      {groupsResponse.data.response.grupos.map((group: any) => (
                        <Button 
                          key={group._id} 
                          variant={selectedGroupId === group._id ? 'default' : 'outline'}
                          onClick={() => setSelectedGroupId(group._id)}
                        >
                          {group.Nome} ({group._id})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Etapa 3: Buscar Mídias */}
            <Card>
              <CardHeader>
                <CardTitle>Etapa 3: Buscar Mídias</CardTitle>
                <CardDescription>Use o ID do grupo selecionado para buscar as mídias.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>ID do Grupo Selecionado: <span className="font-mono bg-gray-100 p-1 rounded">{selectedGroupId || 'Aguardando Etapa 2...'}</span></p>
                <Button onClick={handleFetchMedias} disabled={isLoading || !selectedGroupId}>
                  {isLoading ? 'Buscando...' : 'Buscar Mídias'}
                </Button>
                {mediasResponse && (
                   <div className="mt-4">
                    <h4 className="font-semibold mb-2">Resposta da API de Mídias (JSON):</h4>
                    <pre className="text-sm overflow-x-auto">{JSON.stringify(mediasResponse, null, 2)}</pre>
                  </div>
                )}
                {mediasResponse?.success && mediasResponse.data?.response?.medias && (
                   <div className="mt-4">
                    <h4 className="font-semibold mb-2">Mídias Encontradas ({mediasResponse.data.response.medias.length}):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mediasResponse.data.response.medias.map((media: any) => {
                        // Helper para encontrar a URL correta e normalizá-la
                        let mediaUrl = media.url_download || media.link || media.final || media.url || '';
                        if (mediaUrl.startsWith('//')) {
                          mediaUrl = 'https:' + mediaUrl;
                        }

                        return (
                          <Card key={media._id} className="overflow-hidden">
                            <CardContent className="p-0">
                              {media.type === 'video' || mediaUrl.includes('.mp4') ? (
                                <video
                                  src={mediaUrl}
                                  controls
                                  muted
                                  className="w-full h-40 object-cover bg-black"
                                />
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt={`Mídia ${media._id}`}
                                  className="w-full h-40 object-cover bg-gray-200"
                                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Erro'; }}
                                />
                              )}
                              <div className="p-3 text-xs">
                                <p className="font-mono break-all"><strong>ID:</strong> {media._id}</p>
                                <p className="font-mono break-all mt-1"><strong>URL:</strong> {mediaUrl}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seção de Erro e Logs */}
            {(error || logs.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados e Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
                      <h4 className="font-bold">Ocorreu um Erro:</h4>
                      <p>{error}</p>
                    </div>
                  )}
                  <div className="p-2 bg-gray-800 text-white rounded h-64 overflow-y-auto">
                    <h4 className="font-semibold mb-2">Logs da Sessão:</h4>
                    {logs.map((log, index) => (
                      <div key={index} className={`flex items-start text-sm ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-300'}`}>
                        <span className="w-20 shrink-0">{log.timestamp}</span>
                        <span className="font-mono">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfigTestPage; 