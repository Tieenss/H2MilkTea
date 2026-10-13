// components/ui/date-range-picker.tsx
'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { addDays, format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateRangePickerProps {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  showPresets?: boolean;
}

const presets = [
  {
    label: 'Hôm nay',
    value: 'today',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfDay(today),
        to: endOfDay(today),
      };
    },
  },
  {
    label: 'Hôm qua',
    value: 'yesterday',
    getValue: () => {
      const yesterday = addDays(new Date(), -1);
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      };
    },
  },
  {
    label: 'Tuần này',
    value: 'thisWeek',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfWeek(today, { locale: vi }),
        to: endOfWeek(today, { locale: vi }),
      };
    },
  },
  {
    label: 'Tuần trước',
    value: 'lastWeek',
    getValue: () => {
      const today = new Date();
      const lastWeek = addDays(today, -7);
      return {
        from: startOfWeek(lastWeek, { locale: vi }),
        to: endOfWeek(lastWeek, { locale: vi }),
      };
    },
  },
  {
    label: 'Tháng này',
    value: 'thisMonth',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
    },
  },
  {
    label: 'Tháng trước',
    value: 'lastMonth',
    getValue: () => {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: 'Quý này',
    value: 'thisQuarter',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfQuarter(today),
        to: endOfQuarter(today),
      };
    },
  },
  {
    label: 'Quý trước',
    value: 'lastQuarter',
    getValue: () => {
      const today = new Date();
      const lastQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1);
      return {
        from: startOfQuarter(lastQuarter),
        to: endOfQuarter(lastQuarter),
      };
    },
  },
  {
    label: 'Năm này',
    value: 'thisYear',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfYear(today),
        to: endOfYear(today),
      };
    },
  },
  {
    label: 'Năm trước',
    value: 'lastYear',
    getValue: () => {
      const today = new Date();
      const lastYear = new Date(today.getFullYear() - 1, 0, 1);
      return {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
      };
    },
  },
];

export function DateRangePicker({
  date,
  onDateChange,
  className,
  placeholder = 'Chọn khoảng thời gian',
  showPresets = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetChange = (presetValue: string) => {
    const preset = presets.find(p => p.value === presetValue);
    if (preset && onDateChange) {
      onDateChange(preset.getValue());
      setIsOpen(false);
    }
  };

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    if (onDateChange) {
      onDateChange(selectedDate);
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yyyy', { locale: vi })} -{' '}
                  {format(date.to, 'dd/MM/yyyy', { locale: vi })}
                </>
              ) : (
                format(date.from, 'dd/MM/yyyy', { locale: vi })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {showPresets && (
              <div className="border-r p-3">
                <div className="text-sm font-medium mb-2">Khoảng thời gian</div>
                <Select onValueChange={handlePresetChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn nhanh" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={vi}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}