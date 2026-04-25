export interface AvailabilitySlot {
  id: string;
  instructor_id: string;
  date: string;
  time_start: string;
  time_end: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TimeSlotConfig {
  start: string;
  end: string;
}

export interface DayAvailability {
  date: string;
  day_status: 'available' | 'partial' | 'off';
  time_slots: Array<{
    id?: string;
    start_time: string;
    end_time: string;
    available: boolean;
  }>;
}

export interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  isActive: boolean;
  email: string;
  phone_number?: string;
  country_code?: string;
}

export interface AggregatedAvailabilityData {
  [instructorId: string]: {
    instructor: Instructor;
    availabilityData: DayAvailability[];
  };
}

export type ViewType = 'daily' | 'weekly' | 'monthly';
