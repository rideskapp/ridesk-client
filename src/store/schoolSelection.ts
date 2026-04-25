import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SchoolSelectionState {
  // For super admin
  selectedSchoolId: string | null;
  setSelectedSchoolId: (schoolId: string | null) => void;
  clearSelectedSchool: () => void;
  
  // For instructor (multi-school)
  instructorSelectedSchoolId: string | null;
  setInstructorSelectedSchoolId: (schoolId: string | null) => void;
  clearInstructorSelectedSchool: () => void;
}

export const useSchoolSelectionStore = create<SchoolSelectionState>()(
  persist(
    (set) => ({
      selectedSchoolId: null,
      setSelectedSchoolId: (schoolId) => set({ selectedSchoolId: schoolId }),
      clearSelectedSchool: () => set({ selectedSchoolId: null }),
      
      instructorSelectedSchoolId: null,
      setInstructorSelectedSchoolId: (schoolId) => set({ instructorSelectedSchoolId: schoolId }),
      clearInstructorSelectedSchool: () => set({ instructorSelectedSchoolId: null }),
    }),
    {
      name: "school-selection",
      partialize: (state) => ({
        selectedSchoolId: state.selectedSchoolId,
        instructorSelectedSchoolId: state.instructorSelectedSchoolId,
      }),
    },
  ),
);

