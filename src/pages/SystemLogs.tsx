import { useSystemLogs, SystemLog } from "@/hooks/useSystemLogs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle2, Info, Trash2, XCircle } from "lucide-react";

const LogTypeIcons = {
  info: <span className="text-blue-500">[INFO]</span>,
  warning: <span className="text-yellow-500">[WARN]</span>,
  error: <span className="text-red-500">[ERROR]</span>,
  success: <span className="text-green-500">[OK]</span>,
};

const LogItem = ({ log }: { log: SystemLog }) => {
  const timestamp = format(log.timestamp, "HH:mm:ss", { locale: ptBR });
  
  return (
    <div className="font-mono text-sm whitespace-pre-wrap text-left w-full">
      <span className="text-gray-500">{timestamp}</span>
      <span className="mx-2">{LogTypeIcons[log.type]}</span>
      <span className="text-white">{log.message}</span>
      {log.details && (
        <pre className="mt-1 ml-8 p-2 bg-gray-900/50 rounded text-xs overflow-x-auto border border-gray-800 text-left w-full">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default function SystemLogs() {
  const { logs, clearLogs } = useSystemLogs();

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white w-screen h-screen">
      {/* Barra de título estilo terminal */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-800 w-full">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-sm font-mono">terminal@mupa:~</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearLogs}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Área de logs */}
      <ScrollArea className="flex-1 p-4 font-mono w-full">
        <div className="space-y-1 text-left w-full">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">
              $ No logs found
            </div>
          ) : (
            logs.map((log, index) => <LogItem key={index} log={log} />)
          )}
        </div>
      </ScrollArea>

      {/* Prompt de comando */}
      <div className="p-4 border-t border-gray-800 bg-gray-900 w-full">
        <div className="flex items-center space-x-2 text-left">
          <span className="text-green-500">$</span>
          <span className="text-gray-400">tail -f system.log</span>
        </div>
      </div>
    </div>
  );
} 