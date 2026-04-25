import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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
import { authApi } from "@/services/auth";
import { toast } from "react-hot-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits").regex(/^[0-9]{6}$/, "OTP must contain only numbers"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ForgotPasswordForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    setValue: setResetValue,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email,
    },
  });

  useEffect(() => {
    if (email) {
      setResetValue("email", email);
    }
  }, [email, setResetValue]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      await authApi.forgotPassword(data.email);
      setEmail(data.email);
      setResetValue("email", data.email);
      setIsSuccess(true);
      toast.success(t("auth.otpSent"));
    } catch (error: any) {
      toast.error(error.message || t("auth.forgotPasswordFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      await authApi.resetPassword(
        data.email,
        data.otp,
        data.newPassword,
        data.confirmPassword,
      );
      toast.success(t("auth.passwordResetSuccess"));
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errorMessage =
        error?.message || error?.response?.data?.message || t("auth.passwordResetFailed");
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom right, #eff6ff, #dbeafe)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 inline-block">
            <Logo size="lg" />
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>

        {/* Forgot Password Form */}
        <Card className="shadow-lg bg-white border-0">
          <CardHeader>
            <CardTitle
              className="text-2xl text-center"
              style={{ color: "#111827" }}
            >
              {isSuccess ? t("auth.resetPasswordTitle") : t("auth.forgotPasswordTitle")}
            </CardTitle>
            <CardDescription
              className="text-center"
              style={{ color: "#6b7280" }}
            >
              {isSuccess ? t("auth.resetPasswordDescription") : t("auth.forgotPasswordDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                    style={{ color: "#374151" }}
                  >
                    {t("auth.email")}
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    {...registerReset("email")}
                    className={resetErrors.email ? "border-red-500" : ""}
                    disabled
                  />
                  {resetErrors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {resetErrors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 mb-1"
                    style={{ color: "#374151" }}
                  >
                    {t("auth.otp")}
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    {...registerReset("otp")}
                    className={resetErrors.otp ? "border-red-500" : ""}
                  />
                  {resetErrors.otp && (
                    <p className="text-red-500 text-sm mt-1">
                      {resetErrors.otp.message}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {t("auth.enterOTP")}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                    style={{ color: "#374151" }}
                  >
                    {t("auth.newPassword")}
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...registerReset("newPassword")}
                      className={
                        resetErrors.newPassword ? "border-red-500 pr-10" : "pr-10"
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
                  {resetErrors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {resetErrors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                    style={{ color: "#374151" }}
                  >
                    {t("auth.confirmNewPassword")}
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...registerReset("confirmPassword")}
                      className={
                        resetErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"
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
                  {resetErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {resetErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? t("common.loading")
                    : t("auth.resetPassword")}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                    style={{ color: "#374151" }}
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? t("common.loading")
                    : t("auth.sendResetCode")}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-800"
                style={{ color: "#2563eb" }}
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500" style={{ color: "#9ca3af" }}>
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;

