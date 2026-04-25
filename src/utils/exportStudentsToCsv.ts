import { Student } from "@/services/students";
import i18n from "@/i18n";

/**
 * Escapes a CSV field value
 * Handles commas, quotes, and newlines
 */
const escapeCsvField = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Formats a boolean value as Yes/No (localized)
 */
const formatBoolean = (
  value: boolean | null | undefined,
  t: (key: string, options?: any) => string,
): string => {
  if (value === true) return t("common.yes") || "Yes";
  if (value === false) return t("common.no") || "No";
  return "";
};

/**
 * Formats an array as comma-separated string
 */
const formatArray = (arr: string[] | null | undefined): string => {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
};

/**
 * Formats a date to readable format for CSV export
 */
const formatDateTimeCsv = (
  dateString: string | null | undefined,
  locale?: string,
): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const usedLocale = locale || (i18n && (i18n.language as string)) || "en-US";
    return date.toLocaleString(usedLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
};

/**
 * Exports students data to CSV format
 */
export const exportStudentsToCsv = (
  students: Student[],
  t: (key: string) => string,
): void => {
  if (students.length === 0) {
    throw new Error("No students to export");
  }

  // CSV Headers
  const headers = [
    t("students.csv.id"),
    t("students.csv.firstName"),
    t("students.csv.lastName"),
    t("students.csv.email"),
    t("students.csv.whatsappNumber"),
    t("students.csv.dateOfBirth"),
    t("students.csv.nationality"),
    t("students.csv.weightKg"),
    t("students.csv.heightCm"),
    t("students.csv.canSwim"),
    t("students.csv.primarySport"),
    t("students.csv.emergencyContactName"),
    t("students.csv.emergencyPhone"),
    t("students.csv.medicalConditions"),
    t("students.csv.skillLevel"),
    t("students.csv.preferredDisciplines"),
    t("students.csv.preferredDays"),
    t("students.csv.preferredTimeSlots"),
    t("students.csv.preferredLessonTypes"),
    t("students.csv.preferredLanguages"),
    t("students.csv.ridingBackground"),
    t("students.csv.consentPhysicalCondition"),
    t("students.csv.consentTermsConditions"),
    t("students.csv.consentGdpr"),
    t("students.csv.consentPhotosVideos"),
    t("students.csv.consentMarketing"),
    t("students.csv.consentCustom1"),
    t("students.csv.consentCustom2"),
    t("students.csv.schoolId"),
    t("students.csv.isActive"),
    t("students.csv.createdAt"),
    t("students.csv.updatedAt"),
  ];

  // Build CSV rows
  const rows = students.map((student) => [
    escapeCsvField(student.id),
    escapeCsvField(student.firstName),
    escapeCsvField(student.lastName),
    escapeCsvField(student.email),
    escapeCsvField(student.whatsappNumber),
    escapeCsvField(student.dateOfBirth),
    escapeCsvField(student.nationality),
    escapeCsvField(student.weight),
    escapeCsvField(student.height),
    escapeCsvField(formatBoolean(student.canSwim, t)),
    escapeCsvField(student.primarySport),
    escapeCsvField(student.emergencyContact),
    escapeCsvField(student.emergencyPhone),
    escapeCsvField(student.medicalConditions),
    escapeCsvField(student.skillLevel),
    escapeCsvField(formatArray(student.preferredDisciplines)),
    escapeCsvField(formatArray(student.preferredDays)),
    escapeCsvField(formatArray(student.preferredTimeSlots)),
    escapeCsvField(formatArray(student.preferredLessonTypes)),
    escapeCsvField(formatArray(student.preferredLanguage as string[] | null | undefined)),
    escapeCsvField(student.ridingBackground),
    escapeCsvField(formatBoolean(student.consentPhysicalCondition, t)),
    escapeCsvField(formatBoolean(student.consentTermsConditions, t)),
    escapeCsvField(formatBoolean(student.consentGdpr, t)),
    escapeCsvField(formatBoolean(student.consentPhotosVideos, t)),
    escapeCsvField(formatBoolean(student.consentMarketing, t)),
    escapeCsvField(formatBoolean(student.consentCustom1 as boolean, t)),
    escapeCsvField(formatBoolean(student.consentCustom2 as boolean, t)),
    escapeCsvField(student.schoolId),
    escapeCsvField(formatBoolean(student.isActive, t)),
    escapeCsvField(formatDateTimeCsv(student.createdAt)),
    escapeCsvField(formatDateTimeCsv(student.updatedAt)),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  // Generate filename with timestamp
  const now = new Date();
  const timestamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/[:-]/g, "")
    .replace("T", "-");
  const filename = `students-export-${timestamp}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
