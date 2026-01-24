import React, { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignupLoginBox } from "./components/SignupLoginBox";
import { Password } from "./components/Password";
import { useLocation } from "react-router";
import { InputField } from "../../../components/InputField";
import { ButtonCTA } from "../../../components/ButtonCTA";
import { supabase } from "../../../../supabase/supabaseClient"; 
import type { PostgrestError } from "@supabase/supabase-js";

const LEVELS = ["1", "2", "3", "4"];

type DepartmentOption = {
  dept_id: string;
  department_name: string;
};

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
  const [studentIdValid, setStudentIdValid] = useState(true);

  const [deptOptions, setDeptOptions] = useState<DepartmentOption[]>([]);
  const [deptOptionsLoading, setDeptOptionsLoading] = useState(false);
  const [deptOptionsError, setDeptOptionsError] = useState<string | null>(null);

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

  useEffect(() => {
    let mounted = true;

    async function loadDepartments() {
      setDeptOptionsLoading(true);
      setDeptOptionsError(null);

      try {
        const { data, error } = await supabase
          .from("departments_lookup")
          .select("dept_id, department_name")
          .order("department_name", { ascending: true });

        if (!mounted) return;

        if (error) {
          console.error("Failed to load departments:", error);
          const pgError = error as PostgrestError;
          const details = [pgError.code, pgError.message, pgError.details, pgError.hint]
            .filter(Boolean)
            .join(" | ");
          setDeptOptionsError(details || "Failed to load departments. Please refresh.");
          setDeptOptions([]);
        } else {
          setDeptOptions((data ?? []) as DepartmentOption[]);
        }
      } catch (err) {
        console.error("Unexpected error while loading departments:", err);
        setDeptOptionsError("Unexpected error while loading departments.");
        setDeptOptions([]);
      }

      setDeptOptionsLoading(false);
    }

    loadDepartments();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle OCR data when returning from scanning
  useEffect(() => {
    const ocrData = location.state?.ocrData;
    if (ocrData) {
      console.log("Setting OCR data:", ocrData);
      setFormData(prev => ({
        ...prev,
        name: ocrData.name || prev.name,
        studentId: ocrData.studentId || prev.studentId,
        // OCR might return dept name; we resolve to dept_id once options are loaded
        dept: ocrData.dept || prev.dept,
        batch: ocrData.batch || prev.batch,
      }));
      
      // Clear the state to prevent re-application on refresh
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!formData.dept || deptOptions.length === 0) return;

    const matchesDeptId = deptOptions.some(d => d.dept_id === formData.dept);
    if (matchesDeptId) return;

    const matchByName = deptOptions.find(
      d => d.department_name.toLowerCase() === String(formData.dept).toLowerCase()
    );
    if (matchByName) {
      setFormData(prev => ({ ...prev, dept: matchByName.dept_id }));
    }
  }, [deptOptions, formData.dept]);

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

    if (name === "studentId") {
      setStudentIdValid(isValidStudentId(value));
    }
    
    // Clear error when user starts typing
    if (signupError) {
      setSignupError(null);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidStudentId = (studentId: string) => {
    return /^[0-9]{9}$/.test(studentId);
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

  if (!studentIdValid) {
    alert("Student ID must be exactly 9 digits");
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
    // Check uniqueness constraints that we can validate client-side
    // (email uniqueness is enforced by Supabase Auth; student_id uniqueness is in user_info)
    const { data: existingByStudentId, error: existingByStudentIdError } = await supabase
      .from('user_info')
      .select('student_id')
      .eq('student_id', formData.studentId)
      .maybeSingle();

    if (existingByStudentIdError) {
      console.error("Supabase error (student_id check):", existingByStudentIdError);
      setSignupError(`Could not validate student ID: ${existingByStudentIdError.message}`);
      return;
    }

    if (existingByStudentId) {
      setSignupError("User with this student ID already exists");
      return;
    }

    // Create auth user (auth.users)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      setSignupError(authError.message);
      return;
    }

    const authUid = authData.user?.id;
    if (!authUid) {
      setSignupError("Signup failed: missing auth user id");
      return;
    }

    // Upsert profile row (public.user_info)
    // A DB trigger (e.g. handle_auth_user_created) may create a placeholder row first;
    // upsert ensures we populate the remaining fields instead of failing on duplicate key.
    const { data: profileData, error: profileError } = await supabase
      .from('user_info')
      .upsert({
        auth_uid: authUid,
        email: formData.email,
        name: formData.name,
        // FK expects dept_id (length 2)
        department: formData.dept,
        level: Number.parseInt(formData.level, 10),
        batch: Number.parseInt(formData.batch, 10),
        mobile: formData.mobile || null,
        student_id: formData.studentId,
      }, { onConflict: 'auth_uid' })
      .select();

    if (profileError) {
      console.error("Supabase error (user_info insert):", profileError);
      if (profileError.code === '23505') {
        // Could be either auth_uid or student_id unique constraints
        setSignupError("User profile already exists (duplicate key). Try a different Student ID or login instead.");
      } else if (profileError.code === '42501') {
        setSignupError("Permission denied. Please check your Supabase RLS policies for user_info.");
      } else {
        setSignupError(`Profile creation failed: ${profileError.message}`);
      }
      return;
    }

    console.log("User created successfully:", profileData);
    
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
    alert("Signup successful! Please check your email for verification (if enabled), then login.");
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
        <div className="lg:flex lg:items-center lg:gap-2">
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
          className="lg:hidden"
        />
        <h6 className="lg:mb-1 lg:mt-2 text-text-lighter-lm lg:font-light">
          Or fill up the form below:</h6>
      </>}

      <form onSubmit={handleSubmit} className="">
        {signupError && (
          <div className="lg:mb-4 lg:p-3 bg-red-50 lg:border border-red-200 lg:rounded-lg">
            <p className="text-sm text-red-700">{signupError}</p>
          </div>
        )}
        
        {step === 1 && (
          <div className="lg:space-y-3 lg:animate-fade-in">
            <InputField
              label="Name"
              name="name"
              type="text" 
              value={formData.name}
              changeHandler={handleInputChange}
              required
            />

            <div className="lg:flex lg:flex-col">
              <InputField
                label="Student ID"
                name="studentId"
                type="text"
                value={formData.studentId}
                changeHandler={handleInputChange}
                required
              />
              {!studentIdValid && (
                <p className="text-sm text-accent-lm lg:mt-1">Student ID must be exactly 9 digits.</p>
              )}
            </div>
  
            <div className="lg:flex lg:flex-row lg:w-full lg:align-middle lg:justify-between">
              <div className="lg:flex lg:flex-col">
                <label htmlFor="dept" className="text-text-lm text-md lg:font-medium lg:my-0">Department</label>
                <select
                  name="dept"
                  value={formData.dept}
                  onChange={handleInputChange}
                  className="lg:px-2 bg-primary-lm lg:border border-stroke-grey lg:rounded-lg lg:w-32 lg:h-10 text-base text-text-lighter-lm lg:font-normal focus:outline-accent-lm"
                  required
                >
                  <option value="" className="text-text-lighter-lm">
                    {deptOptionsLoading ? "Loading..." : "Select Dept"}
                  </option>
                  {deptOptions.map(d => (
                    <option key={d.dept_id} value={d.dept_id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
                {!deptOptionsLoading && !deptOptionsError && deptOptions.length === 0 && (
                  <p className="text-xs text-text-lighter-lm lg:mt-1">No departments found.</p>
                )}
                {deptOptionsError && (
                  <div className="lg:mt-1 lg:flex lg:items-start lg:gap-2">
                    <p className="text-xs text-accent-lm lg:wrap-break-word">{deptOptionsError}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="text-xs lg:underline text-accent-lm lg:whitespace-nowrap"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:flex lg:flex-col">
                <label htmlFor="level" className="text-text-lm text-md lg:font-medium lg:my-0">Level</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="lg:px-2 bg-primary-lm lg:border border-stroke-grey lg:rounded-lg lg:w-32 lg:h-10 text-base text-text-lighter-lm lg:font-normal focus:outline-accent-lm"
                  required
                >
                  <option value="" className="text-text-lighter-lm">Select Level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              
              <div className="lg:flex lg:flex-col">
                <label htmlFor="batch" className="text-text-lm text-md lg:font-medium lg:my-0">Batch</label>
                <input
                  name="batch"
                  type="text"
                  value={formData.batch} 
                  onChange={handleInputChange}
                  placeholder="e.g 23"
                  className="lg:px-2 bg-primary-lm lg:border border-stroke-grey lg:rounded-lg lg:w-32 lg:h-10 text-base text-text-lighter-lm lg:font-normal focus:outline-accent-lm"
                  required
                />
              </div>
            </div>

            <div className="lg:flex lg:justify-end lg:pt-4">
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
          <div className="lg:space-y-2 lg:animate-fade-in">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-md text-accent-lm hover:text-hover-btn-lm cursor-pointer"
            >
              ← Back
            </button>

            <div className="lg:flex lg:flex-col">
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
                <p className="text-sm text-accent-lm lg:mt-1">Please enter a valid email address.</p>
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
            />

            <Password
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleConfirmPasswordChange}
              compareValue={formData.password}
              onMatchChange={setPasswordsMatch}
            />

            <div className="lg:flex lg:items-center lg:gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`mt-2 bg-accent-lm hover:bg-hover-btn-lm transition text-primary-lm text-base font-medium px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2
                  ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isLoading ? (
                  <>
                    <div className="lg:animate-spin lg:rounded-full lg:h-4 lg:w-4 border-b-2 border-white"></div>
                    Signing Up...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>

              <span className="text-sm text-text-lighter-lm">
                Already have an account?{" "}
                <Link to="/login" className="lg:underline text-accent-lm">
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