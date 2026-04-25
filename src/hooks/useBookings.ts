import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bookingsApi,
  CreateBookingRequest,
  UpdateBookingRequest,
} from "@/services/bookings";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "@/types";

export function useBookingsList(
  filters?: {
    status?: string;
    studentId?: string;
    productId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    schoolId?: string;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  const { user } = useAuthStore();

  // for super admin, schoolid must be provided. for others
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const hasSchoolId = isSuperAdmin ? filters?.schoolId !== undefined : true;

  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: () => bookingsApi.list(filters),
    enabled: hasSchoolId && (options?.enabled ?? true),
  });
}

export function useBookingDetail(
  id?: string | null,
  schoolId?: string | null,
) {
  return useQuery({
    queryKey: ["booking", id, schoolId],
    queryFn: () =>
      bookingsApi.getById(id!, schoolId ?? undefined),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingsApi.create(data),
    onSuccess: async () => {
      toast.success(t("bookings.created", { defaultValue: "Booking created successfully" }));
      await qc.invalidateQueries({ queryKey: ["bookings"], exact: false });
      await qc.refetchQueries({ queryKey: ["bookings"], exact: false });
    },
    onError: (err: any) => {
      const defaultMsg = t("bookings.createFailed", { defaultValue: "Failed to create booking" });
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || defaultMsg;
      toast.error(msg);
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
      schoolId,
    }: {
      id: string;
      data: UpdateBookingRequest;
      schoolId?: string;
    }) => bookingsApi.update(id, data, schoolId),
    onSuccess: async (_, variables) => {
      toast.success(t("bookings.updated", { defaultValue: "Booking updated successfully" }));
      await qc.invalidateQueries({ queryKey: ["bookings"], exact: false });
      await qc.invalidateQueries({ queryKey: ["booking", variables.id], exact: false });
    },
    onError: (err: any) => {
      const defaultMsg = t("bookings.updateFailed", { defaultValue: "Failed to update booking" });
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || defaultMsg;
      toast.error(msg);
    },
  });
}

export function useBookingPayments(id?: string | null, schoolId?: string | null) {
  return useQuery({
    queryKey: ["booking-payments", id, schoolId],
    queryFn: () => bookingsApi.listPayments(id!, schoolId ?? undefined),
    enabled: !!id,
  });
}

export function useAddBookingPayment() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      schoolId,
      amount,
      payment_date,
      payment_method,
      notes,
    }: {
      id: string;
      schoolId?: string;
      amount: number;
      payment_date: string;
      payment_method?: string;
      notes?: string;
    }) =>
      bookingsApi.addPayment(
        id,
        { amount, payment_date, payment_method, notes },
        schoolId,
      ),
    onSuccess: async (_, vars) => {
      toast.success(
        t("bookings.paymentRecorded", {
          defaultValue: "Booking payment recorded successfully",
        }),
      );
      await qc.invalidateQueries({ queryKey: ["booking", vars.id], exact: false });
      await qc.invalidateQueries({
        queryKey: ["booking-payments", vars.id],
        exact: false,
      });
      await qc.invalidateQueries({ queryKey: ["bookings"], exact: false });
      await qc.refetchQueries({ queryKey: ["booking", vars.id], exact: false });
      await qc.refetchQueries({
        queryKey: ["booking-payments", vars.id],
        exact: false,
      });
      await qc.refetchQueries({ queryKey: ["bookings"], exact: false });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          t("bookings.paymentRecordFailed", {
            defaultValue: "Failed to record booking payment",
          }),
      );
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, schoolId }: { id: string; schoolId?: string }) =>
      bookingsApi.delete(id, schoolId),
    onSuccess: async () => {
      toast.success(
        t("bookings.deleted", { defaultValue: "Booking deleted successfully" }),
      );
      await qc.invalidateQueries({ queryKey: ["bookings"], exact: false });
      await qc.invalidateQueries({ queryKey: ["booking"], exact: false });
    },
    onError: (err: any) => {
      const defaultMsg = t("bookings.deleteFailed", {
        defaultValue: "Failed to delete booking",
      });
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        defaultMsg;
      toast.error(msg);
    },
  });
}
