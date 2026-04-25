import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    addWeeks,
    addMonths,
    subMonths,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PeriodType = "day" | "week" | "month";

interface PeriodDateSelectorProps {
    period: PeriodType;
    onPeriodChange: (period: PeriodType) => void;
    date: Date;
    onDateChange: (date: Date) => void;
    className?: string;
    baseTranslationKey?: string;
}

export const PeriodDateSelector: React.FC<PeriodDateSelectorProps> = ({
    period,
    onPeriodChange,
    date,
    onDateChange,
    className,
    baseTranslationKey = "common.period",
}) => {
    const { t } = useTranslation();
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                calendarRef.current &&
                !calendarRef.current.contains(event.target as Node)
            ) {
                setShowCalendar(false);
            }
        };

        if (showCalendar) {
            document.addEventListener("mousedown", handleClickOutside);
            return () =>
                document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showCalendar]);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return;
        onDateChange(newDate);
        setShowCalendar(false);
    };

    const renderCalendarContent = () => {
        switch (period) {
            case "day":
                return (
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                );
            case "week":
                return (
                    <div className="space-y-2 p-2 w-[280px]">
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const newDate = subMonths(date, 1);
                                    onDateChange(newDate);
                                }}
                            >
                                ←
                            </Button>
                            <h3 className="font-semibold text-sm">
                                {format(date, "MMMM yyyy")}
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const newDate = addMonths(date, 1);
                                    onDateChange(newDate);
                                }}
                            >
                                →
                            </Button>
                        </div>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                            {Array.from({ length: 6 }, (_, i) => {
                                const weekStart = startOfWeek(
                                    addWeeks(startOfMonth(date), i),
                                    { weekStartsOn: 1 }
                                );
                                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                                const isCurrentWeek =
                                    startOfWeek(date, { weekStartsOn: 1 }).getTime() ===
                                    weekStart.getTime();

                                // Only show weeks that overlap with the current month slightly or fully?
                                // The original implementation just shows 6 weeks starting from startOfMonth.
                                return (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => handleDateSelect(weekStart)}
                                        className={cn(
                                            "w-full text-left px-4 py-3 rounded-md hover:bg-gray-100 transition-colors",
                                            isCurrentWeek
                                                ? "bg-pink-500 text-white hover:bg-pink-600"
                                                : ""
                                        )}
                                    >
                                        <div className="font-medium text-sm">
                                            {t(`${baseTranslationKey}.week`, { defaultValue: "Week" })} {i + 1}
                                        </div>
                                        <div
                                            className={cn(
                                                "text-xs",
                                                isCurrentWeek ? "text-pink-100" : "text-gray-500"
                                            )}
                                        >
                                            {format(weekStart, "d")} - {format(weekEnd, "d MMMM")}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case "month":
                return (
                    <div className="space-y-2 p-2 w-[280px]">
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const newDate = new Date(date);
                                    newDate.setFullYear(newDate.getFullYear() - 1);
                                    onDateChange(newDate);
                                }}
                            >
                                ←
                            </Button>
                            <h3 className="font-semibold text-sm">{date.getFullYear()}</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const newDate = new Date(date);
                                    newDate.setFullYear(newDate.getFullYear() + 1);
                                    onDateChange(newDate);
                                }}
                            >
                                →
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }, (_, i) => {
                                const monthDate = new Date(date.getFullYear(), i, 1);
                                const isCurrentMonth = date.getMonth() === i;

                                return (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => {
                                            const newDate = new Date(date);
                                            newDate.setMonth(i);
                                            handleDateSelect(newDate);
                                        }}
                                        className={cn(
                                            "px-2 py-3 rounded-md text-sm font-medium transition-colors",
                                            isCurrentMonth
                                                ? "bg-pink-500 text-white"
                                                : "hover:bg-gray-100"
                                        )}
                                    >
                                        {format(monthDate, "MMM")}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={cn("flex items-center gap-4", className)}>
            <Select
                value={period}
                onValueChange={(value: PeriodType) => onPeriodChange(value)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="day">
                        {t(`${baseTranslationKey}.day`, { defaultValue: "Day" })}
                    </SelectItem>
                    <SelectItem value="week">
                        {t(`${baseTranslationKey}.week`, { defaultValue: "Week" })}
                    </SelectItem>
                    <SelectItem value="month">
                        {t(`${baseTranslationKey}.month`, { defaultValue: "Month" })}
                    </SelectItem>
                </SelectContent>
            </Select>

            <div className="relative" ref={calendarRef}>
                <Button
                    variant="outline"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-[220px] justify-start text-left font-normal"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {period === "day" && format(date, "d MMMM yyyy")}
                    {period === "week" &&
                        `${format(startOfWeek(date, { weekStartsOn: 1 }), "d MMM")} - ${format(
                            endOfWeek(date, { weekStartsOn: 1 }),
                            "d MMM yyyy"
                        )}`}
                    {period === "month" && format(date, "MMMM yyyy")}
                </Button>
                {showCalendar && (
                    <div className="absolute right-0 top-12 z-50 bg-white rounded-md border shadow-lg p-2 min-w-[280px]">
                        {renderCalendarContent()}
                    </div>
                )}
            </div>
        </div>
    );
};
