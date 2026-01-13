import React, { useState } from "react";
import { InputField } from "@/components/InputField";

interface PasswordProps {
  value: string;
  label: string;
  onChange: (value: string) => void;
  showStrength?: boolean;
  compareValue?: string;
  onMatchChange?: (matches: boolean) => void;
}

export const checkPasswordStrength = (password: string) => {
  if (!password) return { score: 0, messages: [], strength: "" };
  
  let score:number = 0;
  const messages:string[] = [];
  
  // Check length
  if (password.length >= 8) score++;
  else messages.push("At least 8 characters");
  
  // Check for uppercase
  if (/[A-Z]/.test(password)) score++;
  else messages.push("One uppercase letter");
  
  // Check for lowercase
  if (/[a-z]/.test(password)) score++;
  else messages.push("One lowercase letter");
  
  // Check for numbers
  if (/\d/.test(password)) score++;
  else messages.push("One number");
  
  // Check for special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else messages.push("One special character");
  
  let strength = "";
  if (score === 5) strength = "Very Strong";
  else if (score >= 4) strength = "Strong";
  else if (score >= 3) strength = "Medium";
  else if (score >= 2) strength = "Weak";
  else strength = "Very Weak";
  
  return { score, strength, messages };
};

// Get strength color based on score
const getStrengthColor = (score: number): string => {
  if (score <= 2) return "#EF4444"; // red
  if (score === 3) return "#F59E0B"; // yellow
  if (score === 4) return "#3B82F6"; // blue
  return "#10B981"; // green
};

export function Password({
  value,
  label,
  onChange,
  showStrength = false,
  compareValue = "",
  onMatchChange,
}: PasswordProps) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordStrength = checkPasswordStrength(value);
  
  // Check if passwords match (only if compareValue is provided)
  const passwordsMatch = compareValue ? value === compareValue : true;
  
  // Notify parent about match status
  React.useEffect(() => {
    if (compareValue && onMatchChange) {
      onMatchChange(passwordsMatch);
    }
  }, [value, compareValue, passwordsMatch, onMatchChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      {/* Password Input with Toggle */}
      <div className="relative">
       <InputField
          name="password"
          label={label}
          type={showPassword ? "text" : "password"}
          value={value}
          changeHandler={handleInputChange}
          rightSlot={
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute mt-2 ml-2 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            // Eye closed icon (hide password)
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          ) : (
            // Eye open icon (show password)
           <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2 2 0 012.829 2.829l1.514 1.514a4 4 0 00-5.857-5.857z" clipRule="evenodd" />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
          )}
          </button>}
        ></InputField>
      </div>

       {/*Password strength*/}
      {showStrength && value && (
        <div className="mt-2 w-full">
          <div className="flex align-center gap-1 w-full text-sm mb-1">
            <span>
              Password strength: <strong>{passwordStrength.strength}</strong>
            </span>
            <span className="text-text-lighter-lm">({passwordStrength.score}/5)</span>
          </div>
          
          {/* Strength Bar */}
          <div className="h-2 w-full bg-stroke-grey rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(passwordStrength.score / 5) * 100}%`,
                backgroundColor: getStrengthColor(passwordStrength.score),
              }}
            />
          </div>
          
          
          {passwordStrength.messages.length > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Requirements: {passwordStrength.messages.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Password Match Indicator*/}
      {compareValue && value && (
        <p
          className={`text-sm mt-2 ${passwordsMatch ? "text-text-lighter-lm" : "text-accent-lm"}`}
        >
          {passwordsMatch ? "✔ Passwords match" : "✖ Passwords do not match"}
        </p>
      )}
    </>
  );
}