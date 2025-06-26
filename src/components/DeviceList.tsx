import { Monitor, Wifi, WifiOff, Eye, Edit, Trash2 } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function DeviceList() {
  const { devices, loading, error, refetch } = useDevices();

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refetch}>Tentar novamente</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center p-8">
        <Monitor className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dispositivo encontrado</h3>
        <p className="text-gray-500">Cadastre um novo dispositivo para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <Card key={device.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{device.apelido}</h3>
                    <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className={device.status === 'online' ? 'bg-green-100 text-green-800' : ''}>
                      {device.status === 'online' ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="ml-1 capitalize">{device.status}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">Serial: {device.serial}</p>
                  {device.empresa && (
                    <p className="text-sm text-gray-500">Empresa: {device.empresa}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
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
  );
} 