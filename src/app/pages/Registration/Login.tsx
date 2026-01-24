import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignupLoginBox } from "./components/SignupLoginBox";
import { Password } from "./components/Password";
import { InputField } from "../../../components/InputField";
import { 
  validateCredentials, 
  generateOTP, 
  storeOTP, 
  sendOTPEmail 
} from "./backend/otpService";
import { LucideXCircle } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOTP, setDevOTP] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDevOTP(null);
    setIsLoading(true);

    try {
      // 1. Validate credentials
      const credentialCheck = await validateCredentials(userId, password);
      
      if (!credentialCheck.success) {
        setError(credentialCheck.message);
        setIsLoading(false);
        return;
      }

      // Store email for display
      setUserEmail(credentialCheck.email!);

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
      const emailResult = await sendOTPEmail(credentialCheck.email!, otp, userId);
      
      if (!emailResult.success && !emailResult.devOTP) {
        setError(emailResult.message);
        setIsLoading(false);
        return;
      }

      // If in development or email failed, show OTP
      if (emailResult.devOTP) {
        setDevOTP(emailResult.devOTP);
        // console.log(`Development OTP for ${userId}: ${emailResult.devOTP}`);
      }

      // 5. Navigate to 2FA page with state
      navigate(`/login/2fa/${encodeURIComponent(userId)}`, {
        state: { 
          email: credentialCheck.email,
          devOTP: emailResult.devOTP // Pass dev OTP for testing
        }
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
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        {/* Error Message */}
        {error && (
          <div className="mb-4 px-3 py-1 bg-accent-lm/15 rounded-lg flex gap-1 items-center">
            <LucideXCircle className="text-accent-lm size-4"></LucideXCircle>
            <p className="text-base text-accent-lm">{error}</p>
          </div>
        )}

        {/* Development OTP Display
        {devOTP && import.meta.env.DEV && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Development Mode:</strong> OTP is: <span className="font-mono font-bold">{devOTP}</span>
            </p>
            <p className="text-xs text-yellow-600 mt-1">
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
        <Password 
          label="Password" 
          value={password} 
          onChange={setPassword} 
        />
                {/* Forgot Password Link */}
        <div className="-mt-3">
          <Link 
            to="/forgot-password" 
            className="text-sm text-accent-lm hover:underline cursor-pointer"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-10">
          <button 
            type="submit" 
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg font-medium bg-accent-lm text-primary-lm cursor-pointer hover:bg-hover-btn-lm transition flex items-center gap-2
              ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              'Login'
            )}
          </button>

          <p className="text-sm text-text-lighter-lm">
            Don't have an account?{" "}
            <Link to="/signup" className="underline text-accent-lm cursor-pointer">
              Sign Up
            </Link>
          </p>
        </div>


        {/* Development Note
        {import.meta.env.DEV && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-center">
            <p className="text-xs text-gray-600">
              Development mode: Check console for OTP
            </p>
          </div>
        )} */}
      </form>
    </SignupLoginBox>
  );
}