// Hook for managing instructor compensation rates
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { compensationApi, type InstructorRate, type CreateInstructorRateRequest, type UpdateInstructorRateRequest } from "@/services/compensation";

export const useInstructorRates = (instructorId: string | undefined, schoolId: string | undefined) => {
  const queryClient = useQueryClient();

  const {
    data: rates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["instructor-rates", instructorId, schoolId],
    queryFn: () => {
      if (!instructorId || !schoolId) {
        throw new Error("Instructor ID and School ID are required");
      }
      return compensationApi.getInstructorRates(instructorId, schoolId);
    },
    enabled: !!instructorId && !!schoolId,
  });

  const createRateMutation = useMutation({
    mutationFn: (data: CreateInstructorRateRequest) => {
      if (!schoolId) throw new Error("School ID is required");
      return compensationApi.createInstructorRate(
        { ...data, school_id: schoolId },
        schoolId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-rates"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-missing-rates"] });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateInstructorRateRequest }) => {
      if (!schoolId) throw new Error("School ID is required");
      return compensationApi.updateInstructorRate(id, updates, schoolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-rates"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-missing-rates"] });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: string) => {
      if (!schoolId) throw new Error("School ID is required");
      return compensationApi.deleteInstructorRate(id, schoolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-rates"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-missing-rates"] });
    },
  });

  return {
    rates: rates || [],
    loading: isLoading,
    error,
    refetch,
    createRate: createRateMutation.mutate,
    updateRate: updateRateMutation.mutate,
    deleteRate: deleteRateMutation.mutate,
    isCreating: createRateMutation.isPending,
    isUpdating: updateRateMutation.isPending,
    isDeleting: deleteRateMutation.isPending,
  };
};

export type { InstructorRate, CreateInstructorRateRequest, UpdateInstructorRateRequest };

