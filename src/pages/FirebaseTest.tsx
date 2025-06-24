import { useEffect, useState } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { Card } from '@/components/ui/card';
import { MediaService } from '@/lib/api/medias';
import { ConfigManager } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FirebaseData {
  [key: string]: any;
}

export default function FirebaseTest() {
  const [data, setData] = useState<FirebaseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();
  
  // Caminho fixo para o Firebase conforme solicitado
  const firebasePath = '1748615528855x344366676713144300';

  // Função para solicitar permissão de notificação
  const requestNotificationPermission = async () => {
    try {
      if (!("Notification" in window)) {
        throw new Error("Este navegador não suporta notificações desktop");
      }

      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({
          title: "Notificações ativadas",
          description: "Você receberá notificações quando houver atualizações.",
        });
      } else {
        setNotificationsEnabled(false);
        toast({
          variant: "destructive",
          title: "Notificações desativadas",
          description: "Permissão para notificações foi negada.",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao configurar notificações';
      toast({
        variant: "destructive",
        title: "Erro",
        description: message,
      });
    }
  };

  // Função para enviar notificação
  const sendNotification = (title: string, body: string) => {
    if (!notificationsEnabled || Notification.permission !== "granted") return;

    try {
      const notification = new Notification(title, {
        body: body,
        icon: "/favicon.ico", // Usar ícone do app
        tag: "firebase-update" // Tag para evitar spam de notificações
      });

      // Focar na janela quando clicar na notificação
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error("Erro ao enviar notificação:", err);
    }
  };

  const updateMedias = async () => {
    try {
      setIsUpdating(true);
      const config = await ConfigManager.getConfig();
      
      if (!config.selectedGroupId) {
        throw new Error('Nenhum grupo selecionado');
      }

      const result = await MediaService.getMediasByGroupId(config.selectedGroupId);
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao atualizar mídias');
      }

      toast({
        title: "Mídias atualizadas",
        description: "As mídias foram atualizadas com sucesso!",
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar mídias';
      toast({
        variant: "destructive",
        title: "Erro na atualização",
        description: message,
      });
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    // Verificar estado inicial das notificações
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }

    // Referência para o caminho especificado no Firebase
    const dbRef = ref(database, firebasePath);

    // Configurar o listener
    onValue(dbRef, async (snapshot) => {
      try {
        const val = snapshot.val();
        const oldData = data; // Guardar dados anteriores
        setData(val);
        setError(null);
        
        // Enviar notificação se houver mudança e notificações estiverem ativadas
        if (oldData !== null && JSON.stringify(oldData) !== JSON.stringify(val)) {
          sendNotification(
            "Atualização Detectada",
            "Uma nova atualização foi detectada no Firebase. Atualizando mídias..."
          );
        }

        // Atualizar mídias quando houver mudança
        await updateMedias();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao ler dados';
        setError(message);
        toast({
          variant: "destructive",
          title: "Erro",
          description: message,
        });
      }
    }, (error) => {
      const message = `Erro na conexão: ${error.message}`;
      setError(message);
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: message,
      });
    });

    // Cleanup: remover o listener quando o componente for desmontado
    return () => {
      off(dbRef);
    };
  }, []); // Executar apenas uma vez na montagem

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Monitor do Firebase</h1>
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Monitorando: {firebasePath}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={updateMedias}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            Atualizar Manualmente
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {notificationsEnabled ? (
            <Bell className="h-4 w-4 text-green-500" />
          ) : (
            <BellOff className="h-4 w-4 text-gray-500" />
          )}
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={() => {
              if (!notificationsEnabled) {
                requestNotificationPermission();
              } else {
                setNotificationsEnabled(false);
                toast({
                  title: "Notificações desativadas",
                  description: "Você não receberá mais notificações de atualizações.",
                });
              }
            }}
          />
          <span className="text-sm">
            Notificações {notificationsEnabled ? 'Ativadas' : 'Desativadas'}
          </span>
        </div>
      </div>

      {/* Exibição de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Exibição dos dados */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-2">Dados em tempo real:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </div>
  );
} 