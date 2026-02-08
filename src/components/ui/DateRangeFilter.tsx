import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DateRangeFilterProps {
  className?: string
  date?: {
    from: Date
    to: Date
  }
  onDateChange: (date: { from: Date; to: Date } | undefined) => void
}

export function DateRangeFilter({
  className,
  date,
  onDateChange,
}: DateRangeFilterProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/y")} - {format(date.to, "dd/MM/y")}
                </>
              ) : (
                format(date.from, "dd/MM/y")
              )
            ) : (
              <span>Selecione uma data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date ? { from: date.from, to: date.to } : undefined}
            onSelect={(range: any) => onDateChange(range)}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {date && (
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground"
            onClick={() => onDateChange(undefined)}
        >
            <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}