'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Enhanced DatePicker với month/year selector
interface DatePickerProps {
    date?: Date;
    onDateChange: (date: Date | undefined) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    showMonthYearPicker?: boolean;
}

const DatePicker = React.memo<DatePickerProps>(({
    date,
    onDateChange,
    placeholder = "Select date",
    label,
    required = false,
    disabled = false,
    className,
    showMonthYearPicker = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState<Date>(date || new Date());

    const handleDateSelect = useCallback((selectedDate: Date | undefined) => {
        onDateChange(selectedDate);
        setIsOpen(false);
    }, [onDateChange]);

    const formattedDate = useMemo(() => {
        return date ? format(date, "dd/MM/yyyy", { locale: vi }) : null;
    }, [date]);

    const handleMonthChange = useCallback((month: string) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(parseInt(month));
        setCurrentMonth(newDate);
    }, [currentMonth]);

    const handleYearChange = useCallback((year: string) => {
        const newDate = new Date(currentMonth);
        newDate.setFullYear(parseInt(year));
        setCurrentMonth(newDate);
    }, [currentMonth]);

    // Generate years (current year back to 1900)
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 1900;
        return Array.from({ length: currentYear - startYear + 1 }, (_, i) =>
            (currentYear - i).toString()
        );
    }, []);

    const months = useMemo(() => [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
        'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
        'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ], []);

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label className="text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
            )}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !date && "text-muted-foreground"
                        )}
                        disabled={disabled}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formattedDate || placeholder}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                        {showMonthYearPicker && (
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <Select
                                        value={currentMonth.getMonth().toString()}
                                        onValueChange={handleMonthChange}
                                    >
                                        <SelectTrigger className="w-[120px] h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map((month, index) => (
                                                <SelectItem key={index} value={index.toString()}>
                                                    {month}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={currentMonth.getFullYear().toString()}
                                        onValueChange={handleYearChange}
                                    >
                                        <SelectTrigger className="w-[80px] h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((year) => (
                                                <SelectItem key={year} value={year}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={vi}
                            className="rounded-md border-0"
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
});

DatePicker.displayName = 'DatePicker';

export { DatePicker };