import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { mockAlerts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { Alert } from '@/types/fleet';

const Alertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.read;
    return alert.severity === filter;
  });

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, read: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <MainLayout 
      title="Alertas" 
      subtitle="Acompanhe todos os alertas do sistema"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">
              {unreadCount > 0 
                ? `${unreadCount} alerta${unreadCount > 1 ? 's' : ''} não lido${unreadCount > 1 ? 's' : ''}`
                : 'Todos os alertas lidos'
              }
            </span>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todos como lidos
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'unread', label: 'Não lidos' },
            { value: 'critical', label: 'Críticos' },
            { value: 'warning', label: 'Atenção' },
            { value: 'info', label: 'Informativos' },
          ].map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value as typeof filter)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onDismiss={handleDismiss}
            />
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum alerta encontrado</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Alertas;
