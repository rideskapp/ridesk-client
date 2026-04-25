import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { instructorRegistrationApi } from "@/services/instructorRegistration";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { MultiSelect } from "@/components/ui/multi-select";
import { LANGUAGE_OPTIONS } from "@/constants/languages";
import { disciplinesApi } from "@/services/disciplines";

export const InstructorRegistrationPage: React.FC = () => {
  const { schoolIdentifier } = useParams<{ schoolIdentifier: string }>();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState<string | undefined>();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState("");
  const [isPrimary, setIsPrimary] = useState<boolean>(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["instructor-registration-school", schoolIdentifier],
    queryFn: async () => {
      if (!schoolIdentifier) throw new Error("Missing school identifier");
      return instructorRegistrationApi.getSchoolInfo(schoolIdentifier);
    },
    enabled: !!schoolIdentifier,
  });

  const {
    data: disciplines = [],
    isLoading: disciplinesLoading,
  } = useQuery({
    queryKey: ["disciplines-public", data?.data?.schoolId],
    queryFn: async () => {
      if (!data?.data?.schoolId) return [];
      return disciplinesApi.getActiveDisciplinesPublic(data.data.schoolId);
    },
    enabled: !!data?.data?.schoolId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!schoolIdentifier) throw new Error("Missing school identifier");
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      return instructorRegistrationApi.registerInstructor(schoolIdentifier, {
        email,
        firstName,
        lastName,
        password,
        whatsappNumber: whatsappNumber || undefined,
        specialties: specialties.length ? specialties : undefined,
        certifications: certifications.length ? certifications : undefined,
        languages: languages.length ? languages : undefined,
        isPrimary,
      });
    },
    onSuccess: (response) => {
      toast.success(response.data.message || "Registration successful");
      navigate("/login");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed";
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Loading school information...</div>
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid registration link</CardTitle>
            <CardDescription>
              This instructor registration link is not valid. Please contact the school for a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schoolName = data?.data?.name || "School";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl shadow-md">
        <CardHeader>
          <CardTitle>Join {schoolName} as an instructor</CardTitle>
          <CardDescription>
            Create or link your Ridesk instructor account to this school.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp number (optional)
              </label>
              <PhoneInput
                value={whatsappNumber}
                onChange={(v) => setWhatsappNumber((v as string) || undefined)}
                placeholder="+12 345 678 901"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
            </div>
          </div>

          {/* Specialties / disciplines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disciplines / specialties (optional)
            </label>
            <div className="space-y-2">
              {disciplinesLoading ? (
                <div className="text-sm text-gray-500">
                  Loading disciplines...
                </div>
              ) : (
                disciplines.map((discipline) => (
                  <label key={discipline.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={specialties.includes(discipline.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSpecialties((prev) => [...prev, discipline.slug]);
                        } else {
                          setSpecialties((prev) =>
                            prev.filter((s) => s !== discipline.slug),
                          );
                        }
                      }}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {discipline.display_name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages (optional)
            </label>
            <MultiSelect
              options={LANGUAGE_OPTIONS.map((lang) => ({
                value: lang,
                label: lang,
              }))}
              selected={languages}
              onChange={(value) =>
                setLanguages(
                  typeof value === "function" ? value(languages) : value,
                )
              }
              placeholder="Select languages"
            />
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certifications (optional)
            </label>
            <div className="space-y-2">
              {certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm text-gray-700">{cert}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 text-xs"
                    onClick={() =>
                      setCertifications((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="Add certification"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newCertification.trim()) {
                      setCertifications((prev) => [
                        ...prev,
                        newCertification.trim(),
                      ]);
                      setNewCertification("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Primary flag */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Set this school as your primary school
              </span>
            </label>
          </div>

          <Button
            className="w-full mt-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorRegistrationPage;

