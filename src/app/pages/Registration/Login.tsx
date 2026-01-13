import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import {SignupLoginBox} from "./components/SignupLoginBox";
import {Password} from "./components/Password";
import { InputField } from "../../../components/InputField";

export function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  console.log("Login attempt", { userId, password });

  if (!userId || !password) {
    console.warn("Validation failed: missing userId or password");
    return;
  }

  const targetPath = `/login/2fa/${encodeURIComponent(userId)}`;
  console.log("Navigating to:", targetPath);

  navigate(targetPath);
}
  // const [isFormValid, setIsFormValid] = useState(false);

  // React.useEffect(() => {
  //   setIsFormValid(userId.trim() !== "" && password.trim() !== "");
  // }, [userId, password]);


  return (
    <SignupLoginBox 
    title="Login" 
    >
      <form onSubmit={handleSubmit} className="space-y-2 max-w-xl">
        <InputField
        type="text"
        label="User ID"
        name="userid"
        value={userId}
        changeHandler={(e)=>setUserId(e.target.value)}
        >
        </InputField>
        <Password label="Password" value={password} onChange={setPassword}/>

        <div className="flex items-center gap-4 mt-10">
          <button 
            type="submit" 
            // disabled={!isFormValid}
            className={`px-6 py-2 rounded-lg font-medium bg-accent-lm text-primary-lm cursor-pointer hover:bg-hover-btn-lm transition
            `}>
              Login
              {/* ${!isFormValid ? "opacity-50 cursor-not-allowed" : ""} */}
          </button>

          <p className="text-sm text-text-lighter-lm">
            Don't have an account?{" "}
            <Link to="/signup" className="underline text-accent-lm cursor-pointer">
              Sign Up
            </Link>
          </p>
        </div>

        {/* {!isFormValid && (
          <p className="text-accent-lm text-sm">All fields are required.</p>
        )} */}

      </form>
    </SignupLoginBox>
  );
}
