import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { RegisterRequest } from "@/services/auth";
import { schoolsApi, School } from "@/services/schools";
import { toast } from "react-hot-toast";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { UserRole } from "@/types/auth";

const signupSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.nativeEnum(UserRole, {
      required_error: "Please select a role",
    }),
    schoolId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // SCHOOL_ADMIN doesn't need schoolId (they will create their own school)
      if (data.role === UserRole.SCHOOL_ADMIN) return true;
      // Other roles need a schoolId
      return data.schoolId && data.schoolId.length > 0;
    },
    {
      message: "Please select a school",
      path: ["schoolId"],
    },
  );

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSignup: (data: RegisterRequest) => void;
  onBackToLogin: () => void;
  isLoading?: boolean;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSignup,
  onBackToLogin,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: UserRole.USER,
      schoolId: "",
    },
  });

  const selectedRole = watch("role");

  // Fetch schools when component mounts
  useEffect(() => {
    const fetchSchools = async () => {
      setLoadingSchools(true);
      try {
        const schools = await schoolsApi.getAll();
        setSchools(schools);
      } catch (error: any) {
        console.error("Failed to fetch schools:", error);
        toast.error(getTranslatedError(error) || t("auth.loadSchoolsFailed", { defaultValue: "Failed to load schools" }));
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  const onSubmit = (data: SignupFormData) => {
    const { confirmPassword, ...signupData } = data;
    onSignup(signupData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 inline-block">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("auth.welcome")}
          </h1>
          <p className="text-gray-600">{t("auth.tagline")}</p>
        </div>

        {/* Language Switcher */}
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>

        {/* Signup Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {t("auth.signup")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("auth.createAccountDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("auth.firstName")}
                  </label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register("firstName")}
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("auth.lastName")}
                  </label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register("lastName")}
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("auth.email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className={
                      errors.password ? "border-red-500 pr-10" : "pr-10"
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("auth.confirmPassword")}
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    className={
                      errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("auth.role")}
                </label>
                <select
                  id="role"
                  {...register("role")}
                  className={`w-full appearance-none pr-10 bg-[right_0.75rem_center] bg-no-repeat bg-[length:16px_16px] px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.role ? "border-red-500" : "border-gray-300"
                  }`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
                  }}
                >
                  <option value="">{t("auth.selectRole")}</option>
                  <option value={UserRole.USER}>{t("roles.USER")}</option>
                  <option value={UserRole.INSTRUCTOR}>
                    {t("roles.INSTRUCTOR")}
                  </option>
                  <option value={UserRole.SCHOOL_ADMIN}>
                    {t("roles.SCHOOL_ADMIN")}
                  </option>
                </select>
                {errors.role && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* School Selection - Only show for non-SCHOOL_ADMIN roles */}
              {selectedRole && selectedRole !== UserRole.SCHOOL_ADMIN && (
                <div>
                  <label
                    htmlFor="schoolId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("auth.school")}
                  </label>
                  <select
                    id="schoolId"
                    {...register("schoolId")}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.schoolId ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={loadingSchools}
                  >
                    <option value="">
                      {loadingSchools
                        ? t("auth.loadingSchools")
                        : t("auth.selectSchool")}
                    </option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  {errors.schoolId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.schoolId.message}
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("common.loading") : t("auth.signup")}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t("auth.alreadyHaveAccount")}{" "}
                <button
                  onClick={onBackToLogin}
                  className="text-primary-500 hover:underline flex items-center justify-center mx-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {t("auth.loginHere")}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">{t("footer.copyright")}</p>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
