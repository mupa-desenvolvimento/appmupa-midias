import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Search,
  FileType,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  File,
  Filter,
  Eye,
  BarChart3,
  Users,
  ArrowUpRight,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { API_CONFIG } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Arquivo {
  id: number;
  nome: string;
  nome_original: string;
  descricao: string;
  tipo: string;
  tamanho: number;
  url: string;
  downloads: number;
  data_upload: string;
  categoria: string;
  subcategoria: string;
  tags: string;
  tipo_arquivo: string;
}

interface ArquivosAgrupados {
  [categoria: string]: Arquivo[];
}

const CATEGORIAS = [
  { valor: 'documentos', label: 'Documentos', icon: FileText },
  { valor: 'imagens', label: 'Imagens', icon: ImageIcon },
  { valor: 'videos', label: 'Vídeos', icon: Video },
  { valor: 'audios', label: 'Áudios', icon: Music },
  { valor: 'outros', label: 'Outros', icon: File }
];

export default function StorageLoja() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [arquivosAgrupados, setArquivosAgrupados] = useState<ArquivosAgrupados>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todos');
  const [subcategoria, setSubcategoria] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('todos');
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid');
  const { toast } = useToast();

  // Carrega a lista de arquivos
  const carregarArquivos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (categoria !== 'todos') params.append('categoria', categoria);
      if (subcategoria) params.append('subcategoria', subcategoria);
      if (tipoSelecionado !== 'todos') params.append('tipo', tipoSelecionado);

      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.storage.list}?${params}`);
      const data = await response.json();

      if (data.success) {
        setArquivos(data.arquivos);
        setArquivosAgrupados(data.arquivosAgrupados);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar arquivos",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarArquivos();
  }, []);

  // Formata o tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Retorna o ícone apropriado para o tipo de arquivo
  const getFileIcon = (tipo: string) => {
    switch (tipo) {
      case 'imagem':
        return <ImageIcon className="h-12 w-12" />;
      case 'video':
        return <Video className="h-12 w-12" />;
      case 'audio':
        return <Music className="h-12 w-12" />;
      case 'documento':
        return <FileText className="h-12 w-12" />;
      default:
        return <File className="h-12 w-12" />;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-purple-100 p-3 rounded-lg mb-3">
            <FileType className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold mb-1">{arquivos.length}</h3>
          <p className="text-gray-600">Arquivos Disponíveis</p>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-100 p-3 rounded-lg mb-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold mb-1">8</h3>
          <p className="text-gray-600">Categorias</p>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-green-100 p-3 rounded-lg mb-3">
            <Download className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold mb-1">8.9K</h3>
          <p className="text-gray-600">Downloads</p>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-orange-100 p-3 rounded-lg mb-3">
            <ArrowUpRight className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold mb-1">99%</h3>
          <p className="text-gray-600">Satisfação</p>
        </Card>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar arquivos, apps, ferramentas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Categorias</SelectItem>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.valor} value={cat.valor}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisualizacao(v => v === 'grid' ? 'lista' : 'grid')}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista de Arquivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {arquivos.map((arquivo) => (
          <Card key={arquivo.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  {getFileIcon(arquivo.tipo_arquivo)}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {arquivo.tipo_arquivo}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-lg mb-2 truncate" title={arquivo.nome_original}>
                {arquivo.nome_original}
              </h3>
              
              <p className="text-sm text-gray-500 mb-4 line-clamp-2" title={arquivo.descricao}>
                {arquivo.descricao || 'Sem descrição'}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatFileSize(arquivo.tamanho)}</span>
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {arquivo.downloads}
                </div>
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50">
              <Button className="w-full" onClick={() => window.open(arquivo.url, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 