// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, otp, student_id } = await req.json();

    if (!email || !otp || !student_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Your Resend API Key - Store in Supabase Function environment variables
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Send email using Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Campus Auth <onboarding@resend.dev>",
        to: [email],
        subject: "Your Campus Login OTP",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Login OTP</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f9f9f9;
                }
                .container {
                  background-color: #ffffff;
                  border-radius: 10px;
                  padding: 30px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo {
                  color: #C23D00;
                  font-size: 28px;
                  font-weight: bold;
                  margin-bottom: 10px;
                }
                .otp-container {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  border-radius: 10px;
                  padding: 25px;
                  text-align: center;
                  margin: 30px 0;
                }
                .otp-code {
                  font-size: 42px;
                  font-weight: bold;
                  color: white;
                  letter-spacing: 10px;
                  font-family: 'Courier New', monospace;
                }
                .info-box {
                  background-color: #f8f9fa;
                  border-left: 4px solid #C23D00;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e9ecef;
                  font-size: 12px;
                  color: #6c757d;
                  text-align: center;
                }
                .warning {
                  color: #dc3545;
                  font-weight: bold;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">CAMPUS</div>
                  <h1 style="color: #2c3e50; margin-bottom: 5px;">Login Verification</h1>
                  <p style="color: #7f8c8d; margin-top: 0;">Secure Access Code</p>
                </div>
                
                <p>Hello,</p>
                <p>You've requested to login to your Campus account. Use the verification code below to complete your login:</p>
                
                <div class="otp-container">
                  <div class="otp-code">${otp}</div>
                </div>
                
                <div class="info-box">
                  <p><strong>Student ID:</strong> ${student_id}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Expires in:</strong> 10 minutes</p>
                </div>
                
                <p class="warning">⚠️ Do not share this code with anyone. Campus will never ask for your verification code.</p>
                
                <p>If you didn't request this code, please ignore this email or contact support if you're concerned about your account's security.</p>
                
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Campus. All rights reserved.</p>
                  <p>This is an automated message, please do not reply to this email.</p>
                  <p>If you need assistance, contact: support@campus.com</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
LOGIN VERIFICATION - CAMPUS

Hello,

You've requested to login to your Campus account.

Your verification code is: ${otp}

Student ID: ${student_id}
Email: ${email}
Expires in: 10 minutes

⚠️ IMPORTANT: Do not share this code with anyone. Campus will never ask for your verification code.

If you didn't request this code, please ignore this email or contact support if you're concerned about your account's security.

© ${new Date().getFullYear()} Campus. All rights reserved.
This is an automated message, please do not reply.
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Resend API error: ${resendResponse.status}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        emailId: result.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
