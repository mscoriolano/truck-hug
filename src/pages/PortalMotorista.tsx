import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TireReportForm } from '@/components/driver-portal/TireReportForm';
import { MaintenanceRequestForm } from '@/components/driver-portal/MaintenanceRequestForm';
import { ExpenseClaimForm } from '@/components/driver-portal/ExpenseClaimForm';
import { DeliveryReceiptForm } from '@/components/driver-portal/DeliveryReceiptForm';
import { FuelReportForm } from '@/components/driver-portal/FuelReportForm';
import { JourneyEventForm } from '@/components/driver-portal/JourneyEventForm';
import { 
  useDriverTireReports, 
  useDriverMaintenanceRequests, 
  useDriverExpenseClaims,
  useDeliveryReceipts 
} from '@/hooks/useDriverReports';
import { useAuth } from '@/hooks/useAuth';
import { 
  CircleDot, 
  Wrench, 
  Receipt, 
  FileCheck, 
  Fuel,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const PortalMotorista: React.FC = () => {
  const { user } = useAuth();
  const { data: tireReports = [] } = useDriverTireReports();
  const { data: maintenanceRequests = [] } = useDriverMaintenanceRequests();
  const { data: expenseClaims = [] } = useDriverExpenseClaims();
  const { data: deliveryReceipts = [] } = useDeliveryReceipts();

  // Filter to show only current user's data
  const myTireReports = tireReports.filter(r => r.driver_id === user?.id);
  const myMaintenanceRequests = maintenanceRequests.filter(r => r.driver_id === user?.id);
  const myExpenseClaims = expenseClaims.filter(r => r.driver_id === user?.id);
  const myDeliveryReceipts = deliveryReceipts.filter(r => r.driver_id === user?.id);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      approved: { label: 'Aprovado', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { label: 'Rejeitado', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      in_progress: { label: 'Em Andamento', variant: 'outline', icon: <AlertCircle className="h-3 w-3" /> },
      completed: { label: 'Concluído', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      paid: { label: 'Pago', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getConditionBadge = (condition: string) => {
    const conditionConfig: Record<string, { label: string; className: string }> = {
      good: { label: 'Bom', className: 'bg-green-500 text-white' },
      warning: { label: 'Atenção', className: 'bg-yellow-500 text-black' },
      critical: { label: 'Crítico', className: 'bg-red-500 text-white' },
    };
    const config = conditionConfig[condition] || conditionConfig.good;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Baixa', className: 'bg-green-500 text-white' },
      normal: { label: 'Normal', className: 'bg-blue-500 text-white' },
      high: { label: 'Alta', className: 'bg-orange-500 text-white' },
      critical: { label: 'Crítica', className: 'bg-red-500 text-white' },
    };
    const config = urgencyConfig[urgency] || urgencyConfig.normal;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <MainLayout 
      title="Portal do Motorista" 
      subtitle="Registre ocorrências, abastecimentos e solicite reembolsos"
    >
      <div className="space-y-6">
        {/* Journey Control - Full Width */}
        <JourneyEventForm />

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            <CardDescription>Selecione o que deseja registrar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <TireReportForm />
              <MaintenanceRequestForm />
              <ExpenseClaimForm />
              <DeliveryReceiptForm />
              <FuelReportForm />
            </div>
          </CardContent>
        </Card>

        {/* History Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meus Registros</CardTitle>
            <CardDescription>Histórico de solicitações e registros</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="maintenance">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="maintenance" className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Manutenções</span>
                  {myMaintenanceRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{myMaintenanceRequests.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-1">
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Reembolsos</span>
                  {myExpenseClaims.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{myExpenseClaims.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tires" className="flex items-center gap-1">
                  <CircleDot className="h-4 w-4" />
                  <span className="hidden sm:inline">Pneus</span>
                  {myTireReports.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{myTireReports.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="deliveries" className="flex items-center gap-1">
                  <FileCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Entregas</span>
                  {myDeliveryReceipts.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{myDeliveryReceipts.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="maintenance" className="space-y-3 mt-4">
                {myMaintenanceRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma solicitação de manutenção</p>
                ) : (
                  myMaintenanceRequests.map(request => (
                    <Card key={request.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{request.vehicle_plate}</p>
                            <p className="text-sm text-muted-foreground">{request.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(request.status)}
                            {getUrgencyBadge(request.urgency)}
                          </div>
                        </div>
                        {request.photos && request.photos.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {request.photos.map((photo, idx) => (
                              <img key={idx} src={photo} alt="" className="h-16 w-16 object-cover rounded" />
                            ))}
                          </div>
                        )}
                        {request.admin_notes && (
                          <p className="mt-2 text-sm bg-muted p-2 rounded">
                            <strong>Resposta:</strong> {request.admin_notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="expenses" className="space-y-3 mt-4">
                {myExpenseClaims.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum pedido de reembolso</p>
                ) : (
                  myExpenseClaims.map(claim => (
                    <Card key={claim.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">R$ {Number(claim.amount).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{claim.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(claim.expense_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(claim.status)}
                            <Badge variant="outline">{claim.expense_type}</Badge>
                          </div>
                        </div>
                        {claim.receipts && claim.receipts.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {claim.receipts.map((receipt, idx) => (
                              <img key={idx} src={receipt} alt="" className="h-16 w-16 object-cover rounded" />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="tires" className="space-y-3 mt-4">
                {myTireReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum relatório de pneu</p>
                ) : (
                  myTireReports.map(report => (
                    <Card key={report.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{report.vehicle_plate} - {report.tire_position}</p>
                            {report.description && (
                              <p className="text-sm text-muted-foreground">{report.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {getConditionBadge(report.condition)}
                        </div>
                        {report.photos && report.photos.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {report.photos.map((photo, idx) => (
                              <img key={idx} src={photo} alt="" className="h-16 w-16 object-cover rounded" />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="deliveries" className="space-y-3 mt-4">
                {myDeliveryReceipts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum comprovante de entrega</p>
                ) : (
                  myDeliveryReceipts.map(receipt => (
                    <Card key={receipt.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{receipt.vehicle_plate}</p>
                            {receipt.recipient_name && (
                              <p className="text-sm text-muted-foreground">Recebido por: {receipt.recipient_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(receipt.delivery_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Entregue
                          </Badge>
                        </div>
                        {receipt.files && receipt.files.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {receipt.files.map((file, idx) => (
                              <img key={idx} src={file} alt="" className="h-16 w-16 object-cover rounded" />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PortalMotorista;
