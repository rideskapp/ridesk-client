import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { studentsApi, Student } from "@/services/students";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { useAuthStore } from "@/store/auth";
import { schoolSettingsApi, SchoolSettings } from "@/services/schoolSettings";
import {
  User,
  Mail,
  Phone,
  MessageCircle,
  Weight,
  Ruler,
  Globe,
  Calendar as CalendarIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  Camera,
  Megaphone,
} from "lucide-react";

interface StudentFormViewModalProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StudentFormViewModal: React.FC<StudentFormViewModalProps> = ({
  studentId,
  open,
  onOpenChange,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const locale = i18n.language === "it" ? "it-IT" : "en-US";

  // For instructors, schoolId will be undefined and backend handles it
  const schoolId = user?.role === "SUPER_ADMIN" ? undefined : user?.schoolId;

  const {
    data: student,
    isLoading,
    error,
  } = useQuery<Student>({
    queryKey: ["student", studentId, schoolId],
    queryFn: () => studentsApi.getStudentById(studentId, schoolId),
    enabled: open && !!studentId,
  });

  const { studentLevels } = useStudentLevels(schoolId);

  const { data: schoolSettings } = useQuery<SchoolSettings>({
    queryKey: ["school-settings", schoolId ?? student?.schoolId],
    queryFn: () => schoolSettingsApi.getBySchoolId((schoolId ?? student?.schoolId)!),
    enabled: open && !!(schoolId ?? student?.schoolId),
  });

  // Get level info for badge color
  const levelInfo = React.useMemo(() => {
    if (!student?.skillLevel) return null;
    return studentLevels.find((l) => l.slug === student.skillLevel);
  }, [student?.skillLevel, studentLevels]);

  // Format date helper
  const formatDateSafe = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student
              ? `${student.firstName} ${student.lastName}`
              : t("students.viewFormData", {
                  defaultValue: "View Student Information",
                })}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 py-4">
            <AlertCircle className="h-5 w-5" />
            <span>
              {t("students.errorLoadingStudent", {
                defaultValue: "Error loading student information",
              })}
            </span>
          </div>
        )}

        {student && !isLoading && !error && (
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {t("students.contactInformation", {
                    defaultValue: "Contact Information",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 break-words">
                    {student.email}
                  </span>
                </div>
                {student.whatsappNumber && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900 break-words">
                        {student.whatsappNumber}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        const numberToUse = student.whatsappNumber;
                        const cleanNumber = numberToUse?.replace(/\D/g, "");
                        if (cleanNumber) {
                          const whatsappWindow = window.open(
                            `https://wa.me/${cleanNumber}`,
                            "_blank",
                            "noopener,noreferrer",
                          );
                          if (whatsappWindow) {
                            whatsappWindow.opener = null;
                          }
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t("students.sendWhatsAppMessage", {
                        defaultValue: "Send WhatsApp message",
                      })}
                    </Button>
                  </div>
                )}
                {student.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900">
                      {t("students.dateOfBirth", {
                        defaultValue: "Date of Birth",
                      })}
                      : {formatDateSafe(student.dateOfBirth)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {(student.emergencyContact || student.emergencyPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("students.emergencyContact", {
                      defaultValue: "Emergency Contact",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {student.emergencyContact && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {t("students.emergencyContactName", {
                          defaultValue: "Contact Name",
                        })}
                      </div>
                      <div className="text-gray-900">
                        {student.emergencyContact}
                      </div>
                    </div>
                  )}
                  {student.emergencyPhone && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {t("students.emergencyPhone", {
                          defaultValue: "Emergency Phone",
                        })}
                      </div>
                      <div className="text-gray-900">
                        {student.emergencyPhone}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Medical Conditions */}
            {student.medicalConditions && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("students.medicalConditions", {
                      defaultValue: "Medical Conditions",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {student.medicalConditions}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills & Disciplines */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("students.skillsAndDisciplines", {
                    defaultValue: "Skills & Disciplines",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.skillLevel && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {t("students.skillLevel", {
                        defaultValue: "Skill Level",
                      })}
                    </div>
                    <Badge
                      style={{
                        backgroundColor: levelInfo?.color || "#6B7280",
                        color: "white",
                      }}
                    >
                      {levelInfo?.name || student.skillLevel}
                    </Badge>
                  </div>
                )}
                {student.preferredDisciplines &&
                  student.preferredDisciplines.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {t("students.preferredDisciplines", {
                          defaultValue: "Preferred Disciplines",
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {student.preferredDisciplines.map((discipline, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="px-3 py-1 text-sm"
                          >
                            {discipline}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Physical Data */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("students.physicalData", {
                      defaultValue: "Physical Data",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {student.weight ||
                  student.height ||
                  student.nationality ||
                  student.canSwim !== undefined ||
                  student.primarySport ||
                  student.ridingBackground ? (
                    <div className="space-y-3">
                      {student.weight && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-5 flex justify-center">
                            <Weight className="w-4 h-4" />
                          </span>
                          <span className="text-gray-900">
                            {student.weight} kg
                          </span>
                        </div>
                      )}
                      {student.height && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-5 flex justify-center">
                            <Ruler className="w-4 h-4" />
                          </span>
                          <span className="text-gray-900">
                            {student.height} cm
                          </span>
                        </div>
                      )}
                      {student.nationality && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">
                            {t("students.nationality", {
                              defaultValue: "Nationality",
                            })}
                          </div>
                          <div className="text-gray-900">
                            {student.nationality}
                          </div>
                        </div>
                      )}
                      {student.canSwim !== undefined && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">
                            {t("students.canSwim", {
                              defaultValue: "Can you swim?",
                            })}
                          </div>
                          <div className="text-gray-900">
                            {student.canSwim
                              ? t("students.canSwimYes", {
                                  defaultValue: "Yes",
                                })
                              : t("students.canSwimNo", { defaultValue: "No" })}
                          </div>
                        </div>
                      )}
                      {student.primarySport && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">
                            {t("students.primarySport", {
                              defaultValue: "Sport",
                            })}
                          </div>
                          <div className="text-gray-900">
                            {student.primarySport}
                          </div>
                        </div>
                      )}
                      {student.ridingBackground && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">
                            {t("students.ridingBackground", {
                              defaultValue: "Riding Background",
                            })}
                          </div>
                          <div className="text-gray-900">
                            {student.ridingBackground}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      {t("students.noDataAvailable", {
                        defaultValue: "No data available",
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Languages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    {t("students.languages", { defaultValue: "Languages" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.isArray(student.preferredLanguage) &&
                  student.preferredLanguage.length > 0 ? (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">
                        {t("students.preferredLanguage", {
                          defaultValue: "Languages spoken:",
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {student.preferredLanguage.map((lang, idx) => (
                          <Badge
                            key={`${lang}-${idx}`}
                            variant="outline"
                            className="px-3 py-1 text-sm"
                          >
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      {t("students.noDataAvailable", {
                        defaultValue: "No data available",
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preferences */}
            {((student.preferredDays?.length ?? 0) > 0 ||
              (student.preferredTimeSlots?.length ?? 0) > 0 ||
              (student.preferredLessonTypes?.length ?? 0) > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("students.preferences", {
                      defaultValue: "Preferences",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {student.preferredDays &&
                      student.preferredDays.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            {t("students.preferredDays", {
                              defaultValue: "Preferred Days",
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {student.preferredDays.map((day) => (
                              <Badge
                                key={day}
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {t(`students.${day}`, { defaultValue: day })}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {student.preferredTimeSlots &&
                      student.preferredTimeSlots.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            {t("students.preferredTimeSlots", {
                              defaultValue: "Preferred Time Slots",
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {student.preferredTimeSlots.map((slot) => (
                              <Badge
                                key={slot}
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {t(`students.${slot}`, { defaultValue: slot })}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {student.preferredLessonTypes &&
                      student.preferredLessonTypes.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            {t("students.preferredLessonTypes", {
                              defaultValue: "Lesson Types",
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {student.preferredLessonTypes.map((type) => (
                              <Badge
                                key={type}
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200"
                              >
                                {t(`students.${type}`, { defaultValue: type })}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Special Needs */}
            {student.specialNeeds && student.specialNeeds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("students.specialNeeds", {
                      defaultValue: "Special Needs",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {student.specialNeeds.map((need, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
                      >
                        {need}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {student.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t("students.generalNotes", {
                      defaultValue: "General Notes",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {student.notes}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stay Information (basic, from form) */}
            {(student.arrivalDate ||
              student.departureDate ||
              student.stayNotes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    {t("students.stay", { defaultValue: "Stay" })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(student.arrivalDate || student.departureDate) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {student.arrivalDate && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              {t("students.arrivalDate", {
                                defaultValue: "Arrival Date",
                              })}
                            </div>
                            <div className="text-gray-900">
                              {formatDateSafe(student.arrivalDate)}
                            </div>
                          </div>
                        )}
                        {student.departureDate && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              {t("students.departureDate", {
                                defaultValue: "Departure Date",
                              })}
                            </div>
                            <div className="text-gray-900">
                              {formatDateSafe(student.departureDate)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {student.stayNotes && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {t("students.stayNotes", {
                            defaultValue: "Stay Notes",
                          })}
                        </div>
                        <div className="text-gray-900 whitespace-pre-wrap">
                          {student.stayNotes}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Consents & Declarations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t("students.declarationsConsents", {
                    defaultValue: "Consents & Declarations",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {student.consentPhysicalCondition === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                      )}
                      <span className="text-sm text-gray-700">
                        {t("students.consentPhysicalCondition", {
                          defaultValue: "Physical Condition",
                        })}
                        : {student.consentPhysicalCondition === true ? t("common.yes") : t("common.no")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {student.consentTermsConditions === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                      )}
                      <span className="text-sm text-gray-700">
                        {t("students.consentTermsConditions", {
                          defaultValue: "Terms & Conditions",
                        })}
                        : {student.consentTermsConditions === true ? t("common.yes") : t("common.no")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {student.consentGdpr === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                      )}
                      <span className="text-sm text-gray-700">
                        {t("students.consentGdpr", {
                          defaultValue: "GDPR Consent",
                        })}
                        : {student.consentGdpr === true ? t("common.yes") : t("common.no")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Camera className={`w-5 h-5 ${student.consentPhotosVideos !== false ? "text-blue-500" : "text-gray-300"}`} aria-hidden="true" />
                      <span className={`text-sm ${student.consentPhotosVideos !== false ? "text-gray-900" : "text-gray-500"}`}>
                        {t("students.consentPhotosVideos", {
                          defaultValue: "Photos/Videos Authorization",
                        })}
                        : {student.consentPhotosVideos !== false ? t("common.yes") : t("common.no")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Megaphone className={`w-5 h-5 ${student.consentMarketing !== false ? "text-green-500" : "text-gray-300"}`} aria-hidden="true" />
                      <span className={`text-sm ${student.consentMarketing !== false ? "text-gray-900" : "text-gray-500"}`}>
                        {t("students.consentMarketing", {
                          defaultValue: "Marketing Consent",
                        })}
                        : {student.consentMarketing !== false ? t("common.yes") : t("common.no")}
                      </span>
                    </div>

                    {/* Custom Consents */}
                    {schoolSettings?.customCheckbox1Enabled && (
                      <div className="flex items-center gap-3">
                        {student.consentCustom1 === true ? (
                          <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" aria-hidden="true" />
                        )}
                        <span className="text-sm text-gray-700">
                          {(() => {
                            const lang = i18n.language.startsWith("it") ? "it" : "en";
                            return schoolSettings.customCheckbox1Label?.[lang] || 
                                   schoolSettings.customCheckbox1Label?.en || 
                                   t("students.customConsent1");
                          })()}
                          : {student.consentCustom1 === true ? t("common.yes") : t("common.no")}
                        </span>
                      </div>
                    )}
                    {schoolSettings?.customCheckbox2Enabled && (
                      <div className="flex items-center gap-3">
                        {student.consentCustom2 === true ? (
                          <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" aria-hidden="true" />
                        )}
                        <span className="text-sm text-gray-700">
                          {(() => {
                            const lang = i18n.language.startsWith("it") ? "it" : "en";
                            return schoolSettings.customCheckbox2Label?.[lang] || 
                                   schoolSettings.customCheckbox2Label?.en || 
                                   t("students.customConsent2");
                          })()}
                          : {student.consentCustom2 === true ? t("common.yes") : t("common.no")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentFormViewModal;
