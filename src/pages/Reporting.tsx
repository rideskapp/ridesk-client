import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useReporting, type PeriodType } from "@/hooks/useReporting";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { PeriodDateSelector } from "@/components/common/PeriodDateSelector";

import { calculateDateRange } from "@/utils/dateRange";
import { formatCurrency } from "@/lib/utils";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const ReportingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customDateRange, setCustomDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const effectiveSchoolId = user?.role === UserRole.SUPER_ADMIN
    ? (selectedSchoolId ?? undefined)
    : user?.schoolId;

  const { settings: schoolSettings } = useSchoolSettings(effectiveSchoolId);

  const formatAmount = (amount: number) =>
    formatCurrency(
      amount,
      schoolSettings?.defaultCurrency || "EUR",
      "it-IT",
    );

  const { data, loading, error } = useReporting({
    period,
    startDate: customDateRange.startDate,
    endDate: customDateRange.endDate,
    schoolId: effectiveSchoolId,
  });

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    setCustomDateRange({});
    // Recalculate range for the current date with new period
    // or let the effect/hook handle it?
    // Reporting hook calculates range based on period if customDateRange is empty.
    // So just clearing customDateRange is enough.
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const dateRange = calculateDateRange(date, period);
    setCustomDateRange(dateRange);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{t("reporting.errorLoading", { defaultValue: "Error loading reporting data" })}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t("reporting.noData", { defaultValue: "No data available" })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t("reporting.title")}
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">
          {t("reporting.subtitle", { defaultValue: "Business analytics dashboard for school owners" })}
        </p>
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <PeriodDateSelector
              period={period}
              onPeriodChange={handlePeriodChange}
              date={selectedDate}
              onDateChange={handleDateChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Overview Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
          {t("reporting.overview")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("reporting.totalRevenue")}
                  </p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {formatAmount(data.overview.totalRevenue)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("reporting.numberOfBookings")}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {data.overview.bookingCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("reporting.numberOfStudents")}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {data.overview.studentCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("reporting.averageRevenuePerBooking")}
                  </p>
                  <p className="text-2xl font-bold mt-1 text-pink-600">
                    {formatAmount(data.overview.averageRevenuePerBooking)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Paid vs Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("reporting.paidVsPending")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-green-50">
              <p className="text-sm text-gray-600 mb-1">{t("reporting.paid")}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatAmount(data.paidVsPending.paid)}
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-50">
              <p className="text-sm text-gray-600 mb-1">{t("reporting.pending")}</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatAmount(data.paidVsPending.pending)}
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-red-50">
              <p className="text-sm text-gray-600 mb-1">{t("reporting.overdue")}</p>
              <p className="text-2xl font-bold text-red-600">
                {formatAmount(data.paidVsPending.overdue)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                {t("reporting.total", { defaultValue: "Total" })}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatAmount(
                  data.paidVsPending.paid +
                    data.paidVsPending.pending +
                    data.paidVsPending.overdue,
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown Section */}
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          {t("reporting.revenueBreakdown")}
        </h2>

        {/* By Booking Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("reporting.byBookingType")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.breakdownByBookingType.length > 0 ? (
                data.breakdownByBookingType.map((item) => (
                  <div key={item.type} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{item.type}</p>
                      <p className="text-sm text-gray-500">
                        {item.count} {t("reporting.bookings", { defaultValue: "bookings" })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600 sm:text-right">
                  {formatAmount(item.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t("reporting.noData", { defaultValue: "No data available" })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Discipline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("reporting.byDiscipline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.breakdownByDiscipline.length > 0 ? (
                data.breakdownByDiscipline.map((item) => (
                  <div key={item.discipline} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">{item.discipline}</p>
                      <p className="text-sm text-gray-500">
                        {item.count} {t("reporting.bookings", { defaultValue: "bookings" })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600 sm:text-right">
                  {formatAmount(item.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t("reporting.noData", { defaultValue: "No data available" })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Instructor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("reporting.byInstructor")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.breakdownByInstructor.length > 0 ? (
                data.breakdownByInstructor.map((item) => (
                  <div key={item.instructorId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{item.instructorName}</p>
                      <p className="text-sm text-gray-500">
                        {item.lessonCount} {t("reporting.lessons", { defaultValue: "lessons" })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600 sm:text-right">
                  {formatAmount(item.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t("reporting.noData", { defaultValue: "No data available" })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportingPage;

