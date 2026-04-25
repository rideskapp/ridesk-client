import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorsApi, type Instructor, type CreateInstructorRequest, type UpdateInstructorRequest } from '@/services/instructors';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';

export const useInstructors = (schoolId?: string) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const enabled = isSuperAdmin ? schoolId !== undefined : true;

  // Fetch instructors
  const {
    data: instructorsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['instructors', searchQuery, schoolId],
    queryFn: () => instructorsApi.getInstructors(1, 100, searchQuery, schoolId),
    select: (data) => data.instructors,
    enabled,
  });

  // Create instructor mutation
  const createInstructorMutation = useMutation({
    mutationFn: (data: CreateInstructorRequest) =>
      instructorsApi.createInstructorBySchoolAdmin(data, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });

  // Update instructor mutation
  const updateInstructorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstructorRequest }) =>
      instructorsApi.updateInstructor(id, data, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });

  // Delete instructor mutation
  const deleteInstructorMutation = useMutation({
    mutationFn: (id: string) =>
      instructorsApi.deleteInstructor(id, schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });

  const instructors = instructorsData || [];

  return {
    instructors,
    loading: isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createInstructor: createInstructorMutation.mutate,
    updateInstructor: updateInstructorMutation.mutate,
    deleteInstructor: deleteInstructorMutation.mutate,
    refetch,
    isCreating: createInstructorMutation.isPending,
    isUpdating: updateInstructorMutation.isPending,
    isDeleting: deleteInstructorMutation.isPending,
  };
};

export type { Instructor, CreateInstructorRequest, UpdateInstructorRequest };
