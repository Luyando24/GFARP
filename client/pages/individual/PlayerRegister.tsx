import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerApi } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { User, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { usePageTitle } from "@/hooks/usePageTitle";
import LanguageToggle from "@/components/navigation/LanguageToggle";
import { useToast } from "@/hooks/use-toast";

export default function PlayerRegister() {
  usePageTitle("Player Registration");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useTranslation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const res = await PlayerApi.register({
        firstName,
        lastName,
        email,
        password,
      });

      if (res.requireVerification) {
        toast({
          title: t("auth.success.title"),
          description: t("auth.success.verifyEmail"),
          duration: 6000,
        });
        navigate("/verification-pending", {
          state: { email, accountType: "player" },
        });
        return;
      }

      if (!res.token) {
        throw new Error(res.message || "Registration failed");
      }

      saveSession({
        userId: res.user.id,
        role: "individual_player",
        schoolId: null,
        tokens: { accessToken: res.token, expiresInSec: 86400 },
      });

      navigate("/player/dashboard");
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden" dir={dir}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-32 left-1/4 w-16 h-16 border-2 border-white rounded-full"></div>
      </div>

      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Link
          to="/"
          className="flex items-center gap-2 text-white hover:text-yellow-300 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">{t('common.backHome')}</span>
        </Link>
        <LanguageToggle />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              {t('auth.register.player')}
            </h1>
            <p className="text-gray-500">{t('auth.register.playerSubtitle')}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  placeholder={t('auth.firstName')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder={t('auth.lastName')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder={t('auth.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-6" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('auth.createAccount')}
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              {t('auth.alreadyHaveAccount')}{" "}
              <Link to="/player/login" className="text-blue-600 hover:underline font-medium">
                {t('auth.loginLink')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
