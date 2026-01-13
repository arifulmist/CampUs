import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SignupLoginBox } from "./components/SignupLoginBox";

export function Login2FA() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [values, setValues] = useState(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(60); // 3 minutes
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(true);
  const [loading, setLoading] = useState(false);

  // Countdown effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  function handleChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return; // only digits
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus(); // move to next box
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const paste = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(paste)) {
      const newValues = paste.split("");
      setValues(newValues);
      newValues.forEach((val, i) => {
        if (inputs.current[i]) inputs.current[i]!.value = val;
      });
      e.preventDefault();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = values.join("");
    console.log("2FA code submitted", { userId, code });

    // Mock validation: only 123456 is valid
    if (code === "123456") {
      navigate("/home"); // success
    } else {
      setError("Invalid or expired OTP."); // show error
    }
  }


  async function handleResend() {
    setLoading(true);
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      setOtpSent(true);
      setTimeLeft(60); // reset timer
      setError("");
    } else {
      setError("Failed to resend OTP.");
    }
    setLoading(false);
  }

  if (!userId) {
    navigate("/login", { replace: true });
    return null;
  }

  return (
    <SignupLoginBox title="Login">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        {otpSent && (
          <p className="text-lg text-text-lighter-lm">
            A 6-digit code has been sent to your email.
          </p>
        )}

        {/* Countdown */}
        {timeLeft > 0 ? (
          <p className="text-accent-lm">
            OTP expires in {Math.floor(timeLeft / 60)}:
            {String(timeLeft % 60).padStart(2, "0")} minutes
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="text-accent-lm underline text-sm"
          >
            {loading ? "Resending..." : "Resend OTP"}
          </button>
        )}

        {/* Six small boxes */}
        <div className="flex gap-2 justify-center w-fit" onPaste={handlePaste}>
          {values.map((val, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={val}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              className="w-11 h-13 text-center text-xl border border-stroke-grey rounded bg-primary-lm"
            />
          ))}
        </div>

        {error && <p className="text-accent-lm">{error}</p>}

        <button
          type="submit"
          className="w-20 px-0 py-2 rounded-lg font-medium bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition cursor-pointer"
        >
          Confirm
        </button>
      </form>
    </SignupLoginBox>
  );
}
