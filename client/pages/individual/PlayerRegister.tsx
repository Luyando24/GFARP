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
  const { t } = useTranslation();

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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-32 left-1/4 w-16 h-16 border-2 border-white rounded-full"></div>
      </div>

      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-yellow-300 transition-colors duration-200 z-10"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Player Registration
            </h1>
            <p className="text-gray-500">Create your individual player profile</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Confirm Password"
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
              Create Account
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <Link to="/player/login" className="text-blue-600 hover:underline font-medium">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
