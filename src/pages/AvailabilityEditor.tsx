import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { instructorsApi, type Instructor } from "@/services/instructors";
import {
  availabilityApi,
  type AvailabilitySlot,
} from "@/services/availability";

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const AvailabilityEditor: React.FC = () => {
  const { t } = useTranslation();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(isoDate(new Date()));
  const [endDate, setEndDate] = useState<string>(isoDate(new Date()));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDate, setNewDate] = useState<string>(isoDate(new Date()));
  const [newStart, setNewStart] = useState<string>("09:00");
  const [newEnd, setNewEnd] = useState<string>("18:00");
  const [error, setError] = useState<string>("");

  const selectedInstructor = useMemo(
    () => instructors.find((i) => i.id === selectedInstructorId) || null,
    [instructors, selectedInstructorId],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await instructorsApi.getInstructors(1, 50);
        if (!mounted) return;
        setInstructors(resp.instructors);
        if (resp.instructors.length && !selectedInstructorId) {
          setSelectedInstructorId(resp.instructors[0].id);
        }
      } catch (e: any) {
        setError(e?.message || t("availability.errors.fetchFailed"));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchSlots = async () => {
    if (!selectedInstructorId) return;
    setLoading(true);
    setError("");
    try {
      const data = await availabilityApi.getRange(
        selectedInstructorId,
        startDate,
        endDate,
      );
      setSlots(data);
    } catch (e: any) {
      setError(e?.message || t("availability.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstructorId, startDate, endDate]);

  const addSlot = async () => {
    if (!selectedInstructorId) return;
    setCreating(true);
    setError("");
    try {
      if (newStart >= newEnd) {
        setError(t("availability.errors.invalidTimeRange"));
        setCreating(false);
        return;
      }
      const check = await availabilityApi.check({
        instructorId: selectedInstructorId,
        date: newDate,
        timeStart: `${newStart}:00`,
        timeEnd: `${newEnd}:00`,
      });
      if (!check.available) {
        setError(t("availability.errors.notAvailable"));
        setCreating(false);
        return;
      }
      await availabilityApi.add({
        instructorId: selectedInstructorId,
        date: newDate,
        timeStart: `${newStart}:00`,
        timeEnd: `${newEnd}:00`,
      });
      await fetchSlots();
    } catch (e: any) {
      setError(e?.message || t("availability.errors.addFailed"));
    } finally {
      setCreating(false);
    }
  };

  const removeSlot = async (id: string) => {
    setError("");
    try {
      await availabilityApi.remove(id);
      await fetchSlots();
    } catch (e: any) {
      setError(e?.message || t("availability.errors.removeFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Instructor Availability
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Define and manage instructor time slots for bookings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="space-y-3">
            <label className="block text-sm font-medium">Instructor</label>
            <select
              value={selectedInstructorId}
              onChange={(e) => setSelectedInstructorId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.firstName} {i.lastName}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground md:col-span-2">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Start</label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">End</label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={addSlot}
              disabled={creating || !selectedInstructor}
              className="inline-flex h-9 items-center rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {creating ? t("availability.adding") : t("availability.addSlot")}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-sm text-muted-foreground">
              {loading
                ? "Loading availability..."
                : `Showing ${slots.length} slot(s)`}
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Start
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      End
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {slots.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-sm">{s.date}</td>
                      <td className="px-4 py-2 text-sm">{s.time_start}</td>
                      <td className="px-4 py-2 text-sm">{s.time_end}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeSlot(s.id)}
                          className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!slots.length && !loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        No availability in the selected range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityEditor;
