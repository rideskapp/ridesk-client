import React, { useMemo } from "react";
import { useWeeklyAvailability, useSpecialDates, SpecialDate } from "@/hooks/useSchoolCalendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import SchoolCalendarView from "@/components/calendar/SchoolCalendarView";

const SchoolCalendar: React.FC = () => {
  const { data: weekly, refetch: refetchWeekly } = useWeeklyAvailability();
  const from = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), []);
  const to = useMemo(() => format(endOfMonth(new Date()), "yyyy-MM-dd"), []);
  const { data: specials, upsert, refetch: refetchSpecials } = useSpecialDates(from, to);

  const handleUpsert = async (items: SpecialDate[]) => {
    await upsert(items);
  };

  return (
    <SchoolCalendarView
      weekly={weekly}
      specials={specials}
      onUpsert={handleUpsert}
      refetchWeekly={refetchWeekly}
      refetchSpecials={refetchSpecials}
    />
  );
};

export default SchoolCalendar;


