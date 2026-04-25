import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { formatDateLocal, getWeekBoundaries } from '@/utils/dateHelpers';
import { AggregatedAvailabilityData, Instructor, ViewType } from '@/types/availability';
import { api } from '@/lib/api';
import { AggregatedWeeklyView } from './AggregatedWeeklyView';
import { AggregatedDailyView } from './AggregatedDailyView';
import { AggregatedMonthlyView } from './AggregatedMonthlyView';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Sun, CalendarDays, Users } from 'lucide-react';

interface AggregatedAvailabilityCalendarProps {
  instructors: Instructor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlotClick?: (instructorId: string, date: Date, timeSlot?: string) => void;
}

export function AggregatedAvailabilityCalendar({
  instructors,
  open,
  onOpenChange,
  onSlotClick,
}: AggregatedAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewType>('weekly');
  const [loading, setLoading] = useState(false);
  const [aggregatedData, setAggregatedData] = useState<AggregatedAvailabilityData>({});
  const [selectedInstructors, setSelectedInstructors] = useState<Set<string>>(new Set());
  const [failedInstructorIds, setFailedInstructorIds] = useState<string[]>([]);

  const activeInstructors = useMemo(
    () => instructors.filter((instructor) => instructor.isActive),
    [instructors]
  );

  useEffect(() => {
    if (open && activeInstructors.length > 0 && selectedInstructors.size === 0) {
      setSelectedInstructors(new Set(activeInstructors.map((i) => i.id)));
    }
  }, [open, activeInstructors.length, selectedInstructors.size]);

  const loadAvailabilityData = useCallback(async () => {
    if (!open || selectedInstructors.size === 0) return;

    setLoading(true);
    setAggregatedData({});

    try {
      let startDate: Date, endDate: Date;

      if (viewMode === 'daily') {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      } else if (viewMode === 'weekly') {
        const { weekStart, weekEnd } = getWeekBoundaries(currentDate);
        startDate = weekStart;
        endDate = weekEnd;
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      }

      const startDateStr = formatDateLocal(startDate);
      const endDateStr = formatDateLocal(endDate);

      const instructorsToLoad = activeInstructors.filter((instructor) =>
        selectedInstructors.has(instructor.id),
      );

      const results = await Promise.allSettled(
        instructorsToLoad.map(async (instructor) => {
          const response = await api.get('/availability', {
            params: {
              instructorId: instructor.id,
              startDate: startDateStr,
              endDate: endDateStr,
            },
          });

          return {
            instructorId: instructor.id,
            instructor,
            availabilityData: response.data.data || [],
          };
        }),
      );

      const data: AggregatedAvailabilityData = {};
      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { instructorId, instructor, availabilityData } = result.value;
          data[instructorId] = { instructor, availabilityData };
        } else {
          // Collect failed instructor IDs and log detailed error
          const instructor = instructorsToLoad[index];
          failed.push(instructor.id);
          console.error(
            `Failed to load availability for instructor ${instructor.id} (${instructor.first_name} ${instructor.last_name}):`,
            result.reason
          );
        }
      });

      setAggregatedData(data);
      setFailedInstructorIds(failed);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  }, [open, selectedInstructors, viewMode, currentDate, activeInstructors]);

  useEffect(() => {
    if (open && selectedInstructors.size > 0) {
      loadAvailabilityData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, viewMode, selectedInstructors, currentDate]);

  const filteredInstructors = useMemo(() => activeInstructors.filter((instructor) =>
    selectedInstructors.has(instructor.id),
  ), [activeInstructors, selectedInstructors]);

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    if (viewMode === 'daily') {
      newDate = direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1);
    } else if (viewMode === 'weekly') {
      const { weekStart: currentMonday } = getWeekBoundaries(currentDate);
      newDate = direction === 'next' ? addWeeks(currentMonday, 1) : subWeeks(currentMonday, 1);
    } else {
      newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('daily');
  };

  const weeklyLabel = useMemo(() => {
    const { weekStart, weekEnd } = getWeekBoundaries(currentDate);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  }, [currentDate]);

  const toggleInstructor = (instructorId: string) => {
    setSelectedInstructors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(instructorId)) {
        newSet.delete(instructorId);
      } else {
        newSet.add(instructorId);
      }
      return newSet;
    });
  };

  const toggleAllInstructors = () => {
    if (selectedInstructors.size === activeInstructors.length) {
      setSelectedInstructors(new Set());
    } else {
      setSelectedInstructors(new Set(activeInstructors.map((i) => i.id)));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-modal-title"
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-[1400px] max-h-[90vh] overflow-auto"
        onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
      >
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 id="availability-modal-title" className="text-2xl font-bold">Instructor Availability Overview</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-2xl hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {failedInstructorIds.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-yellow-600 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  role="img"
                  aria-labelledby="warning-icon-title"
                  focusable="false"
                >
                  <title id="warning-icon-title">Warning</title>
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Partial data load failure
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Failed to load availability for {failedInstructorIds.length} instructor{failedInstructorIds.length > 1 ? 's' : ''}.
                    Showing data for available instructors.
                  </p>
                </div>
              </div>
              <Button
                onClick={loadAvailabilityData}
                variant="outline"
                size="sm"
                disabled={loading}
                className="ml-4"
              >
                Retry
              </Button>
            </div>
          )}

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Visible Instructors</h3>
              {activeInstructors.length > 0 && (
                <Button
                  onClick={toggleAllInstructors}
                  variant="outline"
                  size="sm"
                >
                  {selectedInstructors.size === activeInstructors.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {activeInstructors.length === 0 ? (
                <div role="status" className="w-full text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="font-medium">No instructors available</p>
                  <p className="text-sm">There are no active instructors to display.</p>
                </div>
              ) : (
                activeInstructors.map((instructor) => (
                  <label key={instructor.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedInstructors.has(instructor.id)}
                      onChange={() => toggleInstructor(instructor.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={instructor.avatar} alt={`${instructor.first_name} ${instructor.last_name}`} />
                      <AvatarFallback className="text-xs">
                        {instructor.first_name?.[0]}{instructor.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {instructor.first_name} {instructor.last_name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => navigateDate('prev')}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="px-4 py-2 border rounded font-semibold min-w-[200px] text-center">
                {viewMode === 'daily' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                {viewMode === 'weekly' && weeklyLabel}
                {viewMode === 'monthly' && format(currentDate, 'MMMM yyyy')}
              </div>

              <Button
                onClick={() => navigateDate('next')}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                onClick={goToToday}
                variant="outline"
                size="sm"
              >
                Today
              </Button>
            </div>

            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewType)}>
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue>
                  {viewMode === 'daily' && 'Daily'}
                  {viewMode === 'weekly' && 'Weekly'}
                  {viewMode === 'monthly' && 'Monthly'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  <div className="flex items-start gap-2">
                    <Sun className="h-5 w-5 mt-0.5 text-orange-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Daily</span>
                      <span className="text-xs text-muted-foreground">Detailed daily view</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="h-5 w-5 mt-0.5 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Weekly</span>
                      <span className="text-xs text-muted-foreground">7 days grid view</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="monthly">
                  <div className="flex items-start gap-2">
                    <CalendarIcon className="h-5 w-5 mt-0.5 text-green-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Monthly</span>
                      <span className="text-xs text-muted-foreground">Monthly calendar</span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 overflow-x-auto">
            <div className="mb-2">
              <h3 className="font-semibold">
                Aggregated Availability - {filteredInstructors.length} of{' '}
                {activeInstructors.length} Instructors
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Loading availability...</span>
              </div>
            ) : (
              <>
                {viewMode === 'daily' && (
                  <AggregatedDailyView
                    currentDate={currentDate}
                    aggregatedData={aggregatedData}
                    instructors={filteredInstructors}
                    onSlotClick={onSlotClick}
                  />
                )}
                {viewMode === 'weekly' && (
                  <AggregatedWeeklyView
                    currentDate={currentDate}
                    aggregatedData={aggregatedData}
                    instructors={filteredInstructors}
                    onSlotClick={onSlotClick}
                  />
                )}
                {viewMode === 'monthly' && (
                  <AggregatedMonthlyView
                    currentDate={currentDate}
                    aggregatedData={aggregatedData}
                    instructors={filteredInstructors}
                    onDayClick={handleDayClick}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
