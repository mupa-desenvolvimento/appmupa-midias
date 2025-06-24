import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MediaResponse {
  success: boolean;
  data?: any;
  message?: string;
}

interface Media {
  _id: string;
  type: string;
  url_download?: string;
  link?: string;
  final?: string;
  url?: string;
  grupo?: {
    _id: string;
    Nome: string;
  };
  [key: string]: any;
}

const ConfigTestPage = () => {
  const [response, setResponse] = useState<MediaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyGrupoLojas, setShowOnlyGrupoLojas] = useState(true);

  const testGetMediasAll = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const apiResponse = await fetch('https://mupa.app/api/1.1/wf/get_medias_all', {
        method: 'GET',
        headers: {
          'Authorization': 'Token 9c264e50ddb95a215b446412a3b42b58',
          'Content-Type': 'application/json'
        }
      });

      const data = await apiResponse.json();
      
      setResponse({
        success: apiResponse.ok,
        data: data,
        message: apiResponse.ok ? 'Requisição realizada com sucesso' : 'Erro na requisição'
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaUrl = (media: Media): string => {
    return media.url_download || media.link || media.final || media.url || '';
  };

  const getGroupName = (media: Media): string => {
    if (media.grupo?.Nome) return media.grupo.Nome;
    if (media.grupo?._id) return `Grupo ${media.grupo._id}`;
    if (media.grupo_id) return `Grupo ${media.grupo_id}`;
    return 'Grupo não identificado';
  };

  const getGroupId = (media: Media): string => {
    return media.grupo?._id || media.grupo_id || 'N/A';
  };

  const isGrupoLojas = (media: Media): boolean => {
    const groupName = getGroupName(media).toLowerCase();
    const groupId = getGroupId(media).toLowerCase();
    return groupName.includes('lojas') || groupId.includes('lojas') || groupName.includes('grupo-lojas') || groupId.includes('grupo-lojas');
  };

  const organizeMediasByGroup = (medias: Media[]) => {
    const groups: { [key: string]: { name: string; medias: Media[] } } = {};
    
    medias.forEach(media => {
      // Filtrar apenas grupo-lojas se a opção estiver ativada
      if (showOnlyGrupoLojas && !isGrupoLojas(media)) {
      return;
    }

      const groupId = getGroupId(media);
      const groupName = getGroupName(media);
      
      if (!groups[groupId]) {
        groups[groupId] = {
          name: groupName,
          medias: []
        };
      }
      
      groups[groupId].medias.push(media);
    });
    
    return groups;
  };

  const renderMediaCard = (media: Media) => {
    const mediaUrl = getMediaUrl(media);
    const isVideo = media.type === 'video' || mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
    const isImage = media.type === 'image' || mediaUrl.includes('.jpg') || mediaUrl.includes('.png') || mediaUrl.includes('.jpeg');
    
    return (
      <Card key={media._id} className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          {/* Preview da mídia */}
          <div className="h-48 bg-gray-100 flex items-center justify-center relative">
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                muted
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : isImage ? (
              <img
                src={mediaUrl}
                alt={`Mídia ${media._id}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            
            {/* Fallback quando mídia não carrega */}
            <div className="hidden w-full h-full items-center justify-center bg-gray-200">
              <div className="text-center text-gray-500">
                <div className="text-2xl mb-2">
                  {isVideo ? '🎥' : isImage ? '🖼️' : '📄'}
                </div>
                <div className="text-sm">{media.type || 'Arquivo'}</div>
                <div className="text-xs mt-1 text-red-500">Erro ao carregar</div>
              </div>
            </div>
          </div>
          
          {/* Informações da mídia */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">ID: {media._id}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                media.type === 'video' ? 'bg-red-100 text-red-800' :
                media.type === 'image' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {media.type || 'Arquivo'}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Grupo:</span>
                <span className="ml-1 text-gray-900">{getGroupName(media)}</span>
              </div>
              
              <div className="text-xs">
                <span className="font-medium text-gray-500">Grupo ID:</span>
                <span className="ml-1 font-mono text-gray-600">{getGroupId(media)}</span>
              </div>
            </div>
            
            {/* Link da mídia */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Link da mídia:</div>
              <div className="text-xs font-mono text-blue-600 break-all bg-blue-50 p-2 rounded">
                {mediaUrl || 'Link não disponível'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Teste da API get_medias_all</h1>
          <p className="text-sm text-gray-500">Visualização organizada das mídias por grupo</p>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controles */}
            <Card>
              <CardHeader>
              <CardTitle>Controles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={testGetMediasAll} 
                      disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Executando...' : 'Testar API get_medias_all'}
                </Button>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showOnlyGrupoLojas"
                    checked={showOnlyGrupoLojas}
                    onChange={(e) => setShowOnlyGrupoLojas(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="showOnlyGrupoLojas" className="text-sm text-gray-700">
                    Mostrar apenas grupo-lojas
                  </label>
                </div>
                  </div>
              </CardContent>
            </Card>

          {/* Erro */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Erro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Resposta Organizada */}
          {response && response.success && response.data?.response?.medias && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  {showOnlyGrupoLojas ? 'Mídias do Grupo Lojas' : 'Mídias Organizadas por Grupo'}
                  <span className="ml-2 text-sm text-gray-500">
                    ({response.data.response.medias.length} mídias encontradas)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {Object.entries(organizeMediasByGroup(response.data.response.medias)).map(([groupId, groupData]) => (
                    <div key={groupId} className="space-y-4">
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{groupData.name}</h3>
                        <p className="text-sm text-gray-500">ID do Grupo: {groupId} • {groupData.medias.length} mídia(s)</p>
                  </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupData.medias.map(renderMediaCard)}
                              </div>
                    </div>
                  ))}
                  </div>
              </CardContent>
            </Card>
          )}

          {/* Resposta Completa (JSON) - Opcional */}
          {response && (
              <Card>
                <CardHeader>
                <CardTitle>Resposta Completa (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
                </CardContent>
              </Card>
            )}
        </div>
      </main>
    </div>
  );
};

export default ConfigTestPage; 