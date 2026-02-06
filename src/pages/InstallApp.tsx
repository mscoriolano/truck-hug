import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Detectar se já está instalado (modo standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      setIsInstalled(true);
    }

    // Capturar evento beforeinstallprompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detectar se foi instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || isStandalone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <CardTitle>App Instalado!</CardTitle>
            <CardDescription>
              O TruckHug já está instalado no seu dispositivo.
              Você pode acessá-lo diretamente da tela inicial.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle>Instalar TruckHug</CardTitle>
          <CardDescription>
            Instale o app no seu celular para acesso rápido e funcionamento offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isIOS ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Para instalar no iPhone/iPad:
              </p>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <span>
                    Toque no ícone <Share className="inline h-4 w-4 text-primary" /> Compartilhar
                    na barra inferior do Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <span>
                    Role para baixo e toque em{' '}
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Plus className="h-4 w-4" /> Adicionar à Tela de Início
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <span>Toque em <span className="font-medium">Adicionar</span> no canto superior direito</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Instalar Agora
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p>Para instalar, acesse este link no navegador Chrome ou Safari do seu celular.</p>
              <p className="mt-2 font-medium break-all">{window.location.origin}/install</p>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <h4 className="font-medium text-sm">Vantagens do app instalado:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Acesso rápido pela tela inicial
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Funciona mesmo sem internet
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Notificações de alertas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Experiência de app nativo
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
