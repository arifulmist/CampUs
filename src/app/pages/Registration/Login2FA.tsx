import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { SignupLoginBox } from "./components/SignupLoginBox";
import { verifyOTP, generateOTP, storeOTP, sendOTPEmail } from "./backend/otpService";

export function Login2FA() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [values, setValues] = useState(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [devOTP, setDevOTP] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);

  // Get email and dev OTP from location state
  useEffect(() => {
    if (location.state) {
      setUserEmail(location.state.email || "");
      if (location.state.devOTP) {
        setDevOTP(location.state.devOTP);
      }
    }
  }, [location.state]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Auto-focus first input
  useEffect(() => {
    if (inputs.current[0]) {
      inputs.current[0].focus();
    }
  }, []);

  // Handle OTP input changes
  function handleChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;
    
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
    
    if (error) setError("");
    
    // Move to next input if value entered
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    
    // Auto-submit if all digits entered
    if (newValues.every(v => v !== "") && index === 5) {
      handleSubmitAuto();
    }
  }

  // Handle backspace
  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  // Handle paste
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim();
    
    if (/^\d{6}$/.test(paste)) {
      const newValues = paste.split("");
      setValues(newValues);
      
      // Fill all inputs
      newValues.forEach((val, i) => {
        if (inputs.current[i]) {
          inputs.current[i]!.value = val;
        }
      });
      
      // Focus last input
      if (inputs.current[5]) {
        inputs.current[5].focus();
      }
      
      // Auto-submit
      setTimeout(() => handleSubmitAuto(), 100);
    }
  }

  // Auto-submit when all digits entered
  async function handleSubmitAuto() {
    const code = values.join("");
    if (code.length !== 6) return;
    
    await verifyOTPCode(code);
  }

  // Manual submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = values.join("");
    
    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    await verifyOTPCode(code);
  }

  // Verify OTP code
  async function verifyOTPCode(code: string) {
    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const verification = await verifyOTP(code);
      
      if (verification.success && verification.userData) {
        setSuccess("✅ Verification successful! Redirecting...");
        
        // Store user session
        localStorage.setItem('user', JSON.stringify(verification.userData));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('studentId', String(verification.userData.student_id));
        
        // Redirect to home
        setTimeout(() => {
          navigate("/home");
        }, 1500);
      } else {
        setError(verification.message);
        
        // Clear inputs on error
        setValues(Array(6).fill(""));
        inputs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError("An error occurred during verification");
    } finally {
      setVerifying(false);
    }
  }

  // Handle resend OTP
  async function handleResend() {
    if (!canResend) return;
    
    setLoading(true);
    setError("");
    
    try {
      if (!userId || !userEmail) {
        setError("Missing user details. Please login again.");
        return;
      }

      const otp = generateOTP();
      const stored = await storeOTP(userId, userEmail, otp);
      if (!stored) {
        setError("Failed to generate verification code");
        return;
      }

      const emailResult = await sendOTPEmail(userEmail, otp, userId);
      if (!emailResult.success && !emailResult.devOTP) {
        setError(emailResult.message);
        return;
      }

      if (emailResult.devOTP) {
        setDevOTP(emailResult.devOTP);
      }

      setTimeLeft(600);
      setCanResend(false);
      setSuccess("A new code has been sent.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (error) {
      console.error("Resend error:", error);
      setError("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  // Handle back to login
  function handleBack() {
    navigate("/login");
  }

  if (!userId) {
    navigate("/login", { replace: true });
    return null;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <SignupLoginBox title="Enter Verification Code">
      <div className="space-y-6 max-w-xl">
        {/* Header */}
        <div className="text-center">
          {/* <h3 className="text-lg font-medium text-text-lm mb-2">
            Enter Verification Code
          </h3> */}
          <p className="text-text-lighter-lm">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-accent-lm">
              {userEmail || "your email"}
            </span>
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-online-indicator/15 rounded-lg">
            <p className="text-base text-online-indicator">{success}</p>
          </div>
        )}

        {/* Development OTP Display */}
        {devOTP && import.meta.env.DEV && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Development Mode:</strong> OTP is:{" "}
              <span className="font-mono font-bold text-lg">{devOTP}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This would be sent to {userEmail}
            </p>
          </div>
        )}

        {/* Timer */}
        <div className="text-center">
          {timeLeft > 0 ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
              <span className="text-gray-600">Code expires in:</span>
              <span className="font-mono font-bold text-accent-lm">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
              <span className="text-red-600 font-medium">Code expired</span>
            </div>
          )}
        </div>

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit}>
          {/* OTP Input Boxes */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {values.map((val, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                value={val}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={1}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-stroke-grey rounded-lg bg-primary-lm focus:border-accent-lm focus:outline-none transition-all"
                disabled={verifying}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 text-center">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={verifying || values.join("").length !== 6}
            className={`w-full py-3 rounded-lg font-medium bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition flex items-center justify-center gap-2 mb-4
              ${verifying || values.join("").length !== 6 ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-base font-medium text-accent-lm hover:text-hover-btn-lm transition flex items-center gap-1"
          >
            ← Back to Login
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className={`text-base font-light transition flex items-center gap-1
              ${canResend 
                ? "text-accent-lm hover:text-hover-btn-lm cursor-pointer" 
                : "text-text-lighter-lm cursor-not-allowed"
              }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                Resending...
              </>
            ) : (
              'Resend Code'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-text-lighter-lm pt-4">
          <p>Didn't receive the code? Check your spam folder.</p>
        </div>
      </div>
    </SignupLoginBox>
  );
}