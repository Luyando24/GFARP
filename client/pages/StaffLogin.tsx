import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { handleError, validateEmail, validateRequired } from "@/lib/errors";
import { Trophy, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      validateRequired(email, "Email");
      validateRequired(password, "Password");
      if (!validateEmail(email)) throw new Error("Please enter a valid email address");

      const response: any = await Api.post("football-auth/staff/login", {
        email: email.toLowerCase().trim(),
        password,
      });

      if (!response.success) {
        throw new Error(response.message || "Login failed");
      }

      saveSession({
        userId: response.data.user.id,
        role: "staff",
        schoolId: response.data.user.academyId,
        email: response.data.user.email,
        permissions: Array.isArray(response.data.user.permissions)
          ? response.data.user.permissions
          : [],
        tokens: {
          accessToken: response.data.token,
          expiresInSec: response.data.expiresInSec ?? 12 * 3600,
        },
      } as any);

      navigate("/academy-dashboard");
    } catch (e: any) {
      setError(String(e?.message || e));
      handleError(e, "Staff Login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl text-gray-800">Staff Login</CardTitle>
          <p className="text-sm text-gray-500">Sign in to your academy workspace</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="h-11"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/portal" className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              All portals
            </Link>
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Academy admin login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
