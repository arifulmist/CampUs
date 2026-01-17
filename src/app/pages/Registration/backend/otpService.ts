import { supabase, callEdgeFunction } from './supabaseClient';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in database
 */
export async function storeOTP(studentId: string, email: string, otp: string): Promise<boolean> {
  try {
    // OTP expires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing OTPs for this student (optional)
    await supabase
      .from('otp_verification')
      .delete()
      .eq('student_id', studentId);

    // Insert new OTP
    const { error } = await supabase
      .from('otp_verification')
      .insert({
        student_id: studentId,
        email: email,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (error) {
      console.error('Error storing OTP:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception storing OTP:', error);
    return false;
  }
}

/**
 * Send OTP via Resend
 */
export async function sendOTPEmail(email: string, otp: string, studentId: string): Promise<{
  success: boolean;
  message: string;
  devOTP?: string;
}> {
  try {
    // Get values directly
const supabaseUrl = 'https://jbwgefxvczlimjemgslt.supabase.co'
const supabaseKey = 'sb_publishable_Bxj3qsK6iictW40ISesQjw_NYAMLqam'
    
    // Direct fetch without callEdgeFunction
    const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}` // KEY IS HERE
      },
      body: JSON.stringify({
        email,
        otp,
        student_id: studentId
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.error('Error sending OTP email:', result.error);
      
      // For development
      return {
        success: true,
        message: 'OTP generated (dev mode)',
        devOTP: otp
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Exception sending OTP email:', error);
    
    return {
      success: true,
      message: 'OTP generated (email failed)',
      devOTP: otp
    };
  }
}

/**
 * Verify OTP from database
 */
export async function verifyOTP(studentId: string, otp: string): Promise<{
  success: boolean;
  message: string;
  userData?: any;
}> {
  try {
    // Get the latest valid OTP for this student
    const { data, error } = await supabase
      .from('otp_verification')
      .select('*')
      .eq('student_id', studentId)
      .eq('otp_code', otp)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('otp_verification')
      .update({ is_used: true })
      .eq('id', data.id);

    if (updateError) {
      console.error('Error marking OTP as used:', updateError);
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('user_info')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      userData: userData
    };
  } catch (error) {
    console.error('Exception verifying OTP:', error);
    return {
      success: false,
      message: 'An error occurred during verification'
    };
  }
}

/**
 * Validate user credentials
 */
export async function validateCredentials(studentId: string, password: string): Promise<{
  success: boolean;
  message: string;
  email?: string;
  userData?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('user_info')
      .select('*')
      .eq('student_id', studentId)
      .eq('password', password)
      .single();

    if (error || !data) {
      return {
        success: false,
        message: 'Invalid student ID or password'
      };
    }

    return {
      success: true,
      message: 'Credentials valid',
      email: data.email,
      userData: data
    };
  } catch (error) {
    console.error('Error validating credentials:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
}