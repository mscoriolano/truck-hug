import { Bell, Search, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockAlerts } from '@/data/mockData';
import { useTheme } from 'next-themes';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const unreadAlerts = mockAlerts.filter(a => !a.read).length;
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              className="w-64 pl-9 bg-secondary border-border focus:ring-primary"
            />
          </div>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadAlerts > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadAlerts}
              </Badge>
            )}
          </Button>

          {/* User */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}
