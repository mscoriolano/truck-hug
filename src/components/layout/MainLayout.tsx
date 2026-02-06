import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CriticalAlertOverlay } from '@/components/control-tower/CriticalAlertOverlay';
import { useUserRole } from '@/hooks/useUserRole';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isManager } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      {/* Critical Alerts Overlay - only for managers */}
      {isManager && <CriticalAlertOverlay />}
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        className={cn(
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="lg:pl-64 transition-all duration-300">
        {/* Mobile header with menu button */}
        <div className="lg:hidden sticky top-0 z-20 h-14 bg-background/80 backdrop-blur-lg border-b border-border flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="ml-3 text-lg font-bold text-foreground truncate">{title}</h1>
        </div>
        
        {/* Desktop header */}
        <div className="hidden lg:block">
          <Header title={title} subtitle={subtitle} />
        </div>
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
