import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  startDate?: Date;
  endDate?: Date;
  onDateChange: (startDate?: Date, endDate?: Date) => void;
}

export const DateRangeFilter = ({ startDate, endDate, onDateChange }: DateRangeFilterProps) => {
  const [quickFilter, setQuickFilter] = useState<string>('all');

  const handleQuickFilter = (value: string) => {
    setQuickFilter(value);
    const now = new Date();

    switch (value) {
      case 'all':
        onDateChange(undefined, undefined);
        break;
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        onDateChange(today, tomorrow);
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        onDateChange(startOfWeek, now);
        break;
      case 'this_month':
        onDateChange(startOfMonth(now), endOfMonth(now));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        onDateChange(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case 'this_year':
        onDateChange(startOfYear(now), endOfYear(now));
        break;
      case 'last_year':
        const lastYear = subYears(now, 1);
        onDateChange(startOfYear(lastYear), endOfYear(lastYear));
        break;
      case 'custom':
        break;
    }
  };

  const clearFilter = () => {
    setQuickFilter('all');
    onDateChange(undefined, undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={quickFilter} onValueChange={handleQuickFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="this_week">Esta semana</SelectItem>
          <SelectItem value="this_month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês passado</SelectItem>
          <SelectItem value="this_year">Este ano</SelectItem>
          <SelectItem value="last_year">Ano passado</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {quickFilter === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => onDateChange(date, endDate)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => onDateChange(startDate, date)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {(startDate || endDate) && (
        <Button variant="ghost" size="sm" onClick={clearFilter}>
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      )}

      {(startDate || endDate) && (
        <span className="text-sm text-muted-foreground">
          {startDate && format(startDate, "dd/MM/yyyy", { locale: ptBR })}
          {startDate && endDate && ' - '}
          {endDate && format(endDate, "dd/MM/yyyy", { locale: ptBR })}
        </span>
      )}
    </div>
  );
};
