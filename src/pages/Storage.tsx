import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileType, Download, Folder, File, Image, Video, Music, FileText, AlertCircle, X, Smartphone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { API_CONFIG } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const CATEGORIAS = [
  { valor: 'aplicativos', label: 'Aplicativos' },
  { valor: 'documentos', label: 'Documentos' },
  { valor: 'imagens', label: 'Imagens' },
  { valor: 'videos', label: 'Vídeos' },
  { valor: 'audios', label: 'Áudios' },
  { valor: 'outros', label: 'Outros' }
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

export default function Storage() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todos');
  const [subcategoria, setSubcategoria] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('todos');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Carrega a lista de arquivos
  const carregarArquivos = useCallback(async () => {
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
  }, [busca, categoria, subcategoria, tipoSelecionado]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, isThumb = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      if (isThumb) {
        if (files[0].type.startsWith('image/')) {
          setSelectedThumbnail(files[0]);
        } else {
          toast({
            title: "Erro",
            description: "Por favor, selecione apenas imagens para o thumbnail",
            variant: "destructive"
          });
        }
      } else {
        setSelectedFile(files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isThumb = false) => {
    if (e.target.files && e.target.files.length > 0) {
      if (isThumb) {
        setSelectedThumbnail(e.target.files[0]);
      } else {
        setSelectedFile(e.target.files[0]);
      }
    }
  };

  const validateFile = (file: File): string | null => {
    if (!file) return "Nenhum arquivo selecionado";
    
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande. Tamanho máximo permitido: ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    const allowedTypes = [
      // Aplicativos
      'application/vnd.android.package-archive',
      'application/x-msdownload',
      'application/x-msdos-program',
      // Imagens
      'image/jpeg',
      'image/png',
      'image/gif',
      // Vídeos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      // Áudios
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Outros
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed'
    ];

    // Permitir APK mesmo que o MIME type não seja reconhecido corretamente
    if (file.name.toLowerCase().endsWith('.apk')) {
      return null;
    }

    if (!allowedTypes.includes(file.type)) {
      return "Tipo de arquivo não permitido";
    }

    return null;
  };

  const uploadWithProgress = async (formData: FormData): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
          }));
        } else {
          reject(new Error(`HTTP Error: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Erro na rede durante o upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelado'));
      });

      xhr.open('POST', `${API_CONFIG.baseURL}${API_CONFIG.endpoints.storage.upload}`);
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);
    setUploadProgress(0);

    if (!selectedFile) {
      setUploadError("Por favor, selecione um arquivo para upload");
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append('arquivo', selectedFile);
    if (selectedThumbnail) {
      formData.append('thumbnail', selectedThumbnail);
    }

    const uploadWithRetry = async (attempt: number = 0): Promise<void> => {
      try {
        setUploading(true);
        const response = await uploadWithProgress(formData);
        const data = await response.json();

        if (data.success) {
          setUploadProgress(100);
          toast({
            title: "Sucesso!",
            description: "Arquivo enviado com sucesso",
          });
          formRef.current?.reset();
          setSelectedFile(null);
          setSelectedThumbnail(null);
          carregarArquivos();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          setUploadError(`Tentativa ${attempt + 1}/${MAX_RETRIES} falhou. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return uploadWithRetry(attempt + 1);
        }
        
        setUploadError(error instanceof Error ? error.message : 'Erro desconhecido');
        toast({
          title: "Erro no upload",
          description: "Todas as tentativas de upload falharam",
          variant: "destructive"
        });
      } finally {
        if (attempt === MAX_RETRIES - 1) {
          setUploading(false);
        }
      }
    };

    uploadWithRetry();
  };

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
      case 'aplicativo':
        return <Smartphone className="h-6 w-6" />;
      case 'imagem':
        return <Image className="h-6 w-6" />;
      case 'video':
        return <Video className="h-6 w-6" />;
      case 'audio':
        return <Music className="h-6 w-6" />;
      case 'documento':
        return <FileText className="h-6 w-6" />;
      default:
        return <File className="h-6 w-6" />;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Novo Upload</h1>
        <p className="text-gray-600">Adicione novos arquivos à sua plataforma</p>
      </div>

      {uploadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro no Upload</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações do Arquivo */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações do Arquivo
            </h2>

            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input 
                id="titulo" 
                name="titulo" 
                placeholder="Nome do arquivo ou aplicativo"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea 
                id="descricao" 
                name="descricao" 
                className="mt-1"
                placeholder="Descreva o arquivo, suas funcionalidades e como usar"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select 
                name="categoria" 
                value={categoria}
                onValueChange={setCategoria}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat.valor} value={cat.valor}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input 
                id="tags" 
                name="tags" 
                placeholder="Ex: android, windows, mobile (separadas por vírgula)"
                className="mt-1"
              />
            </div>

            {selectedFile?.name.toLowerCase().endsWith('.apk') && (
              <div>
                <Label htmlFor="versao">Versão do Aplicativo</Label>
                <Input 
                  id="versao" 
                  name="versao" 
                  placeholder="Ex: 1.0.0"
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="privado" name="privado" className="rounded border-gray-300" />
              <Label htmlFor="privado">Arquivo privado</Label>
            </div>
          </div>

          {/* Área de Upload */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-4 transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-200'}
              ${uploadError ? 'border-red-500 bg-red-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, false)}
          >
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {selectedFile ? selectedFile.name : "Arraste seu arquivo ou clique para selecionar"}
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                Suporta arquivos de até {formatFileSize(MAX_FILE_SIZE)}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Formatos aceitos: APK, PDF, ZIP, DOC, XLS, MP3, MP4, JPG, PNG
              </p>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Badge>{formatFileSize(selectedFile.size)}</Badge>
                  <Badge variant="outline">
                    {selectedFile.name.split('.').pop()?.toUpperCase()}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <input
              type="file"
              onChange={(e) => handleFileChange(e, false)}
              className="hidden"
              id="arquivo"
              accept=".apk,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif,.mp3,.mp4,.avi,.wav"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('arquivo')?.click()}
              disabled={uploading}
            >
              Selecionar Arquivo
            </Button>
          </div>

          {/* Barra de Progresso */}
          {(uploading || uploadProgress > 0) && (
            <div className="col-span-full space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500 text-center">{uploadProgress}% concluído</p>
            </div>
          )}

          {/* Botão de Submit */}
          <div className="col-span-full">
            <Button 
              type="submit" 
              className="w-full"
              disabled={uploading || !selectedFile}
            >
              {uploading ? 'Enviando...' : 'Enviar Arquivo'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 