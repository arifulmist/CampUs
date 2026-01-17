import React, { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignupLoginBox } from "./components/SignupLoginBox";
import { Password } from "./components/Password";
import { useLocation } from "react-router";
import { InputField } from "../../../components/InputField";
import { ButtonCTA } from "../../../components/ButtonCTA";
import { supabase } from "./backend/supabaseClient"; // Import Supabase client

const DEPTS = ["CSE", "EECE", "CE", "ME", "NSE", "NAME", "EWCE", "PME", "BME", "ARCH"];
const LEVELS = ["1", "2", "3", "4"];

type FormData = {
  name: string;
  studentId: string;
  dept: string;
  level: string;
  batch: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

export function Signup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [emailValid, setEmailValid] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    studentId: "",
    dept: "",
    level: "",
    batch: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  // Handle OCR data when returning from scanning
  useEffect(() => {
    const ocrData = location.state?.ocrData;
    if (ocrData) {
      console.log("Setting OCR data:", ocrData);
      setFormData(prev => ({
        ...prev,
        name: ocrData.name || prev.name,
        studentId: ocrData.studentId || prev.studentId,
        dept: ocrData.dept || prev.dept,
        batch: ocrData.batch || prev.batch,
      }));
      
      // Clear the state to prevent re-application on refresh
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  function chooseFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFileName(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFileName(f.name);
      
      navigate("/signup/ocr", { 
        state: { 
          fileBase64: base64, 
          fileName: f.name,
          fileType: f.type 
        } 
      });
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(f);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === "email") {
      setEmailValid(isValidEmail(value));
    }
    
    // Clear error when user starts typing
    if (signupError) {
      setSignupError(null);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      password: value
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      confirmPassword: value
    }));
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSignupError(null);

  // Validation checks
  if (!passwordsMatch) {
    alert("Passwords do not match");
    return;
  }

  if (!emailValid) {
    alert("Please enter a valid email address");
    return;
  }

  // Check if all required fields are filled
  if (!formData.name || !formData.studentId || !formData.dept || !formData.level || 
      !formData.batch || !formData.email || !formData.mobile || !formData.password) {
    alert("Please fill in all required fields");
    return;
  }

  setIsLoading(true);

  try {
    // Check if user already exists - FIXED QUERY
    // First check by email
    const { data: existingByEmail, error: emailError } = await supabase
      .from('user_info')
      .select('email')
      .eq('email', formData.email)
      .maybeSingle(); // Use maybeSingle instead of single

    // Check by student ID
    const { data: existingById, error: idError } = await supabase
      .from('user_info')
      .select('student_id')
      .eq('student_id', formData.studentId)
      .maybeSingle();

    // If either exists, show error
    if (existingByEmail || existingById) {
      setSignupError("User with this email or student ID already exists");
      setIsLoading(false);
      return;
    }

    // Insert new user into the database
    const { data, error } = await supabase
      .from('user_info')
      .insert({
        student_id: formData.studentId,
        name: formData.name,
        department: formData.dept,
        level: formData.level,
        batch: formData.batch,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile || null
      })
      .select(); // Returns the inserted row

    if (error) {
      console.error("Supabase error:", error);
      
      // Handle specific error cases
      if (error.code === '23505') {
        setSignupError("User with this email or student ID already exists");
      } else if (error.code === '42501') {
        setSignupError("Permission denied. Please check your Supabase RLS policies.");
      } else {
        setSignupError(`Signup failed: ${error.message}`);
      }
      setIsLoading(false);
      return;
    }

    console.log("User created successfully:", data);
    
    // Clear form data
    setFormData({
      name: "",
      studentId: "",
      dept: "",
      level: "",
      batch: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    });
    
    // Show success message and redirect
    alert("Signup successful! You can now login.");
    navigate('/login');
    
  } catch (error) {
    console.error("Unexpected error:", error);
    setSignupError("An unexpected error occurred. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <SignupLoginBox title="Sign Up">
      {step === 1 &&
      <>
        <h5>Upload your ID</h5>
        <div className="flex items-center gap-2">
          <ButtonCTA label="Choose File" clickEvent={chooseFile}></ButtonCTA>
          <p className="text-sm text-text-lighter-lm">
            {fileName ?? "Upload ID (image/pdf)"}
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={onFileChange}
          className="hidden"
        />
        <h6 className="mb-1 mt-2 text-text-lighter-lm font-light">
          Or fill up the form below:</h6>
      </>}

      <form onSubmit={handleSubmit} className="">
        {signupError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{signupError}</p>
          </div>
        )}
        
        {step === 1 && (
          <div className="space-y-3 animate-fade-in">
            <InputField
              label="Name"
              name="name"
              type="text" 
              value={formData.name}
              changeHandler={handleInputChange}
              required
            />

            <InputField
              label="Student ID"
              name="studentId"
              type="text"
              value={formData.studentId} 
              changeHandler={handleInputChange}
              required
            />
  
            <div className="flex flex-row w-full align-middle justify-between">
              <div className="flex flex-col">
                <label htmlFor="dept" className="text-text-lm text-md font-medium my-0">Department</label>
                <select
                  name="dept"
                  value={formData.dept}
                  onChange={handleInputChange}
                  className="px-2 bg-primary-lm border border-stroke-grey rounded-lg w-32 h-10 text-base text-text-lighter-lm font-normal focus:outline-accent-lm"
                  required
                >
                  <option value="" className="text-text-lighter-lm">Select Dept</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="level" className="text-text-lm text-md font-medium my-0">Level</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="px-2 bg-primary-lm border border-stroke-grey rounded-lg w-32 h-10 text-base text-text-lighter-lm font-normal focus:outline-accent-lm"
                  required
                >
                  <option value="" className="text-text-lighter-lm">Select Level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col">
                <label htmlFor="batch" className="text-text-lm text-md font-medium my-0">Batch</label>
                <input
                  name="batch"
                  type="text"
                  value={formData.batch} 
                  onChange={handleInputChange}
                  placeholder="e.g 23"
                  className="px-2 bg-primary-lm border border-stroke-grey rounded-lg w-32 h-10 text-base text-text-lighter-lm font-normal focus:outline-accent-lm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-md text-accent-lm hover:text-hover-btn-lm cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 animate-fade-in">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-md text-accent-lm hover:text-hover-btn-lm cursor-pointer"
            >
              ← Back
            </button>

            <div className="flex flex-col">
              <InputField 
                label="Email"
                name="email"
                type="email"
                value={formData.email} 
                placeholder="abc123@yourmail.com"
                changeHandler={handleInputChange}
                required
              />
              {!emailValid && (
                <p className="text-sm text-accent-lm mt-1">Please enter a valid email address.</p>
              )}
            </div>
    
            <InputField
              label="Mobile Number"
              name="mobile"
              type="text"
              value={formData.mobile} 
              changeHandler={handleInputChange}
              required
            />

            <Password
              label="Password"
              value={formData.password}
              onChange={handlePasswordChange}
              showStrength={true}
              required
            />

            <Password
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleConfirmPasswordChange}
              compareValue={formData.password}
              onMatchChange={setPasswordsMatch}
              required
            />

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`mt-2 bg-accent-lm hover:bg-hover-btn-lm transition text-primary-lm text-base font-medium px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2
                  ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing Up...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>

              <span className="text-sm text-text-lighter-lm">
                Already have an account?{" "}
                <Link to="/login" className="underline text-accent-lm">
                  Login
                </Link>
              </span>
            </div>
          </div>
        )}
      </form>
    </SignupLoginBox>
  );
}