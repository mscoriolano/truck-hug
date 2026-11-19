import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  from: string; to: string; plate: string; driver: string; plates: string[]; drivers: string[];
  onChange: (p: Partial<{ from: string; to: string; plate: string; driver: string }>) => void;
};
export function PanelFilters({ from, to, plate, driver, plates, drivers, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={plate} onValueChange={(v) => onChange({ plate: v })}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Veículo" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos os veículos</SelectItem>{plates.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={driver} onValueChange={(v) => onChange({ driver: v })}>
        <SelectTrigger className="w-52"><SelectValue placeholder="Motorista" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos os motoristas</SelectItem>{drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="date" className="w-40" value={from} onChange={(e) => e.target.value && onChange({ from: e.target.value })} />
      <Input type="date" className="w-40" value={to} onChange={(e) => e.target.value && onChange({ to: e.target.value })} />
    </div>
  );
}
