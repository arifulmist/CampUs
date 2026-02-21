import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignupLoginBox } from "./components/SignupLoginBox";
import { Password } from "./components/Password";
import { InputField } from "../../../components/InputField";
import {
  validateCredentials,
  generateOTP,
  storeOTP,
  sendOTPEmail,
} from "./backend/otpService";
import { LucideXCircle } from "lucide-react";
import { useEnterToNextField } from "@/hooks/useEnterToNextField";

export function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleEnterToNext = useEnterToNextField();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Validate credentials
      const credentialCheck = await validateCredentials(userId, password);

      if (!credentialCheck.success) {
        setError(credentialCheck.message);
        setIsLoading(false);
        return;
      }

      // 2. Generate OTP
      const otp = generateOTP();

      // 3. Store OTP in database
      const otpStored = await storeOTP(userId, credentialCheck.email!, otp);

      if (!otpStored) {
        setError("Failed to generate verification code");
        setIsLoading(false);
        return;
      }

      // 4. Send OTP via email
      const emailResult = await sendOTPEmail(
        credentialCheck.email!,
        otp,
        userId,
      );

      if (!emailResult.success && !emailResult.devOTP) {
        setError(emailResult.message);
        setIsLoading(false);
        return;
      }

      // 5. Navigate to 2FA page with state
      navigate(`/login/2fa/${encodeURIComponent(userId)}`, {
        state: {
          email: credentialCheck.email,
          devOTP: emailResult.devOTP, // Pass dev OTP for testing
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SignupLoginBox title="Login">
      <form onSubmit={handleSubmit} onKeyDown={handleEnterToNext} className="lg:space-y-4 lg:max-w-xl">
        {/* Error Message */}
        {error && (
          <div className="lg:mb-4 lg:px-3 lg:py-1 bg-accent-lm/15 lg:rounded-lg lg:flex lg:gap-1 lg:items-center">
            <LucideXCircle className="text-accent-lm lg:size-4"></LucideXCircle>
            <p className="text-base text-accent-lm">{error}</p>
          </div>
        )}

        {/* Development OTP Display
        {devOTP && import.meta.env.DEV && (
          <div className="lg:mb-4 lg:p-3 bg-yellow-50 lg:border border-yellow-200 lg:rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Development Mode:</strong> OTP is: <span className="lg:font-mono lg:font-bold">{devOTP}</span>
            </p>
            <p className="text-xs text-yellow-600 lg:mt-1">
              This would be sent to: {userEmail}
            </p>
          </div>
        )} */}

        {/* Student ID Field */}
        <InputField
          type="text"
          label="Student ID"
          name="userid"
          value={userId}
          changeHandler={(e) => setUserId(e.target.value)}
          required
          placeholder="Enter your student ID"
        />

        {/* Password Field */}
        <Password label="Password" value={password} onChange={setPassword} />
        {/* Forgot Password Link */}
        {/* <div className="lg:-mt-3">
          <Link
            to="/forgot-password"
            className="text-sm text-accent-lm hover:underline cursor-pointer"
          >
            Forgot Password?
          </Link>
        </div> */}

        {/* Action Buttons */}
        <div className="lg:flex lg:items-center lg:gap-4 lg:mt-10">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg font-medium bg-accent-lm text-primary-lm cursor-pointer hover:bg-hover-btn-lm transition flex items-center gap-2
              ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isLoading ? (
              <>
                <div className="lg:animate-spin lg:rounded-full lg:h-4 lg:w-4 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              "Login"
            )}
          </button>

          <p className="text-sm text-text-lighter-lm">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="lg:underline text-accent-lm cursor-pointer"
            >
              Sign Up
            </Link>
          </p>
        </div>

        {/* Development Note
        {import.meta.env.DEV && (
          <div className="lg:mt-4 lg:p-2 bg-gray-100 lg:rounded text-center">
            <p className="text-xs text-gray-600">
              Development mode: Check console for OTP
            </p>
          </div>
        )} */}
      </form>
    </SignupLoginBox>
  );
}
