import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import SchoolCalendarView from "@/components/calendar/SchoolCalendarView";
import {
  useWeeklyAvailabilityForSchool,
  useSpecialDatesForSchool,
} from "@/hooks/useSuperAdminSchoolCalendar";
import { SpecialDate } from "@/hooks/useSchoolCalendar";
import { useTranslation } from "react-i18next";

const SuperAdminSchoolCalendarEditor: React.FC = () => {
  const { t } = useTranslation();
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { selectedSchoolId } = useSchoolSelectionStore();

  const from = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), []);
  const to = useMemo(() => format(endOfMonth(new Date()), "yyyy-MM-dd"), []);

  const { data: school, isLoading: loading } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsApi.getById(schoolId!),
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: weekly, refetch: refetchWeekly } = useWeeklyAvailabilityForSchool(schoolId);
  const { data: specials, upsert, refetch: refetchSpecials } = useSpecialDatesForSchool(
    schoolId,
    from,
    to,
  );

  const handleUpsert = async (items: SpecialDate[]) => {
    await upsert(items);
  };

  // redirect when selected school changes
  useEffect(() => {
    if (selectedSchoolId && selectedSchoolId !== schoolId) {
      navigate(`/admin/school-calendars/${selectedSchoolId}`, { replace: true });
    }
  }, [selectedSchoolId, schoolId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-gray-700">{t("schoolCalendar.loading")}</span>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">{t("schoolCalendar.schoolNotFound")}</h1>
          <Button variant="outline" onClick={() => navigate("/admin/school-calendars")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("schoolCalendar.backToList")}
          </Button>
        </div>
        <p className="text-sm text-gray-600">{t("schoolCalendar.schoolNotFoundMessage")}</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate("/admin/school-calendars")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("schoolCalendar.backToSchoolCalendars")}
        </Button>
      </div>
      <SchoolCalendarView
        weekly={weekly}
        specials={specials}
        onUpsert={handleUpsert}
        refetchWeekly={refetchWeekly}
        refetchSpecials={refetchSpecials}
        schoolName={school.name}
      />
    </div>
  );
};

export default SuperAdminSchoolCalendarEditor;

