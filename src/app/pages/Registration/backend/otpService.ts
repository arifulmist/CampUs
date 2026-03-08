import {
  supabase,
  callEdgeFunction,
} from "@/supabase/supabaseClient";

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("[OTP] Generated OTP:", otp);
  return otp;
}

/**
 * Store OTP in database
 */
export async function storeOTP(
  studentId: string,
  email: string,
  otp: string,
): Promise<boolean> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authUid = authData.user?.id;

    if (authError || !authUid) {
      console.error("User must be signed in to store OTP:", authError);
      return false;
    }

    // OTP expires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Upsert OTP (otp_verification PK is auth_uid)
    const { error } = await supabase.from("otp_verification").upsert(
      {
        auth_uid: authUid,
        student_id: studentId,
        email: email,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      },
      { onConflict: "auth_uid" },
    );

    if (error) {
      console.error("Error storing OTP:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception storing OTP:", error);
    return false;
  }
}

/**
 * Send OTP via Supabase Edge Function (Resend)
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  studentId: string,
): Promise<{
  success: boolean;
  message: string;
  devOTP?: string;
}> {
  try {
    console.log("[OTP] Attempting to send OTP email to", email);

    const result = await callEdgeFunction("send-otp", {
      email,
      otp,
      student_id: studentId,
    });

    if (result.error) {
      console.error("Error sending OTP email:", result.error);

      // For development / fallback: return OTP so it can be shown in UI
      return {
        success: true,
        message: "OTP generated (email failed)",
        devOTP: otp,
      };
    }

    console.log("[OTP] Email send request successful for", email);

    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error) {
    console.error("Exception sending OTP email:", error);

    return {
      success: true,
      message: "OTP generated (email failed)",
      devOTP: otp,
    };
  }
}

/**
 * Verify OTP from database
 */
export async function verifyOTP(otp: string): Promise<{
  success: boolean;
  message: string;
  userData?: Record<string, unknown>;
}> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authUid = authData.user?.id;

    if (authError || !authUid) {
      return {
        success: false,
        message: "Not authenticated. Please login again.",
      };
    }

    // Get the latest valid OTP for this student
    const { data, error } = await supabase
      .from("otp_verification")
      .select("*")
      .eq("auth_uid", authUid)
      .eq("otp_code", otp)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: "Invalid or expired OTP",
      };
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from("otp_verification")
      .update({ is_used: true })
      .eq("auth_uid", authUid);

    if (updateError) {
      console.error("Error marking OTP as used:", updateError);
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("user_info")
      .select("*")
      .eq("auth_uid", authUid)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: "User not found",
      };
    }

    return {
      success: true,
      message: "OTP verified successfully",
      userData: userData as Record<string, unknown>,
    };
  } catch (error) {
    console.error("Exception verifying OTP:", error);
    return {
      success: false,
      message: "An error occurred during verification",
    };
  }
}

/**
 * Validate user credentials
 */
export async function validateCredentials(
  studentId: string,
  password: string,
): Promise<{
  success: boolean;
  message: string;
  email?: string;
  authUid?: string;
  userData?: Record<string, unknown>;
}> {
  try {
    // Resolve email from student_id
    const { data: userInfo, error: lookupError } = await supabase
      .from("user_info")
      .select("email")
      .eq("student_id", studentId)
      .single();

    if (lookupError || !userInfo?.email) {
      console.error("Error looking up user email:", lookupError);
      return {
        success: false,
        message: "Invalid Student ID or Password",
      };
    }

    // Authenticate using Supabase Auth
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: userInfo.email,
        password,
      });

    if (signInError || !signInData.user) {
      return {
        success: false,
        message: "Invalid student ID or password",
      };
    }

    return {
      success: true,
      message: "Credentials valid",
      email: userInfo.email,
      authUid: signInData.user.id,
      userData: userInfo as unknown as Record<string, unknown>,
    };
  } catch (error) {
    console.error("Error validating credentials:", error);
    return {
      success: false,
      message: "An error occurred during login",
    };
  }
}
