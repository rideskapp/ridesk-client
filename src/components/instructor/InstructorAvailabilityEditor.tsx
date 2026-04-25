import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Trash2, AlertCircle } from "lucide-react";
import { availabilityApi, AvailabilitySlot } from "@/services/availability";
import { useAuthStore } from "@/store/auth";
import { useUserRole } from "@/hooks/useUserRole";

const InstructorAvailabilityEditor: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { permissions } = useUserRole();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form state for adding new availability
  const [newDate, setNewDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [newStart, setNewStart] = useState<string>("09:00");
  const [newEnd, setNewEnd] = useState<string>("18:00");

  // Date range for viewing availability
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    return today.toISOString().split("T")[0];
  });

  // Check if user has permission to manage their own availability
  useEffect(() => {
    if (!permissions.canManageOwnAvailability) {
      setError(t("availability.errors.noPermission"));
      return;
    }
  }, [permissions, t]);

  // Fetch availability slots
  const fetchSlots = async () => {
    if (!user?.id || !permissions.canManageOwnAvailability) return;

    setLoading(true);
    setError("");
    try {
      const data = await availabilityApi.getRange(user.id, startDate, endDate);
      setSlots(data);
    } catch (e: any) {
      setError(e?.message || t("availability.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [user?.id, startDate, endDate, permissions.canManageOwnAvailability]);

  // Add new availability slot
  const addSlot = async () => {
    if (!user?.id || !permissions.canManageOwnAvailability) return;

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      if (newStart >= newEnd) {
        setError(t("availability.errors.invalidTimeRange"));
        setCreating(false);
        return;
      }

      // Check if instructor is available for the selected time range
      // The check endpoint is for verifying existing availability, not for adding new slots
      // const check = await availabilityApi.check({
      //   instructorId: user.id,
      //   date: newDate,
      //   timeStart: `${newStart}:00`,
      //   timeEnd: `${newEnd}:00`,
      // });

      // if (!check.available) {
      //   setError(t("availability.errors.notAvailable"));
      //   setCreating(false);
      //   return;
      // }

      await availabilityApi.add({
        instructorId: user.id,
        date: newDate,
        timeStart: `${newStart}:00`,
        timeEnd: `${newEnd}:00`,
      });

      setSuccess(t("availability.success.added"));
      await fetchSlots();

      // Reset form
      setNewDate(new Date().toISOString().split("T")[0]);
      setNewStart("09:00");
      setNewEnd("18:00");
    } catch (e: any) {
      setError(e?.message || t("availability.errors.addFailed"));
    } finally {
      setCreating(false);
    }
  };

  // Remove availability slot
  const removeSlot = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      await availabilityApi.remove(id);
      setSuccess(t("availability.success.removed"));
      await fetchSlots();
    } catch (e: any) {
      setError(e?.message || t("availability.errors.removeFailed"));
    }
  };

  // Group slots by date
  const groupedSlots = useMemo(() => {
    const groups: { [key: string]: AvailabilitySlot[] } = {};
    slots.forEach((slot) => {
      if (!groups[slot.date]) {
        groups[slot.date] = [];
      }
      groups[slot.date].push(slot);
    });
    return groups;
  }, [slots]);

  // Format time for display
  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!permissions.canManageOwnAvailability) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("availability.errors.noPermission")}
              </h3>
              <p className="text-gray-600">
                {t("availability.errors.noPermissionDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("availability.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{t("availability.description")}</p>
        </CardContent>
      </Card>

      {/* Add New Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("availability.addNew")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="newDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("availability.date")}
              </label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label
                htmlFor="newStart"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("availability.startTime")}
              </label>
              <Input
                id="newStart"
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="newEnd"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("availability.endTime")}
              </label>
              <Input
                id="newEnd"
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={addSlot}
            disabled={creating}
            className="w-full md:w-auto"
          >
            {creating ? t("common.loading") : t("availability.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>{t("availability.viewRange")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("availability.startDate")}
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("availability.endDate")}
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Availability Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("availability.slots")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
                <div className="text-gray-600">{t("common.loading")}</div>
              </div>
            </div>
          ) : Object.keys(groupedSlots).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t("availability.noSlots")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSlots)
                .sort(
                  ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
                )
                .map(([date, dateSlots]) => (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {formatDate(date)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dateSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between bg-gray-50 rounded-md p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">
                              {formatTime(slot.time_start)} -{" "}
                              {formatTime(slot.time_end)}
                            </span>
                            {slot.active ? (
                              <Badge variant="default" className="text-xs">
                                {t("availability.active")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {t("availability.inactive")}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlot(slot.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorAvailabilityEditor;
