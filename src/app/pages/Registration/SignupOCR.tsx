import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {SignupLoginBox} from "./components/SignupLoginBox";
// import Illustration from "../../assets/images/Signup_img.svg";
import { extractTextFromImage } from "./backend/OCR";
import type { OCRResult } from "./backend/OCR";

/**
 * SignupOCR page:
 * - expects location.state = { fileBase64: string, fileName?: string, fileType?: string }
 */

type LocationState = {
  fileBase64?: string;
  fileName?: string;
  fileType?: string;
} | null;

export function SignupOCR() {
  const loc = useLocation();
  const navigate = useNavigate();
  const state = (loc.state as LocationState) ?? null;
  const fileBase64 = state?.fileBase64 ?? null;
  const fileName = state?.fileName ?? null;
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If user landed here without a file selected, send them back
  if (!fileBase64) {
    return <Navigate to="/signup" replace />;
  }

  async function handleScan() {
    if (!fileBase64) return;
    
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    
    try {
      console.log("Starting OCR scan for:", fileName);
      
      // Perform OCR with base64 string
      const result = await extractTextFromImage(fileBase64);
      
      console.log("OCR Result:", result);
      
      if (result.success) {
        setScanResult(result);
        
        // Navigate back to signup with extracted data
        setTimeout(() => {
          navigate("/signup", { 
            state: { 
              ocrData: {
                name: result.name,
                studentId: result.studentId,
                dept: result.department,
                batch: result.batch,
              }
            } 
          });
        }, 1500); // Show result briefly before navigating
      } else {
        setError(result.error || "Failed to scan the ID card. Please ensure the image is clear and try again.");
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError("An error occurred during scanning. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }

  // Handle manual back navigation (without scanning)
  function handleBack() {
    navigate("/signup");
  }

  return (
    <SignupLoginBox 
    title="Scan Your ID" 
    >
      <div className="flex flex-col items-center">
        {/* Instructions */}
        <div className="mb-3 text-center">
          <p className="text-md text-text-lighter-lm">
            Make sure your ID card is clearly visible in the box below
          </p>
          {fileName && (
            <p className="text-base text-accent-lm font-medium">File: {fileName}</p>
          )}
        </div>
        
        {/* Card preview with fixed dimensions */}
        <div
          className="relative w-70 h-100 bg-white rounded-lg shadow-md flex items-center justify-center overflow-hidden mb-6"
          style={{ border: "2px solid #C23D00" }}
        >
          {/* Image sits inside and covers the area */}
          {fileBase64 && (
            <img 
              src={fileBase64} 
              alt={fileName ?? "selected id"} 
              className="max-w-full max-h-full object-contain"
            />
          )}
          
          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                <p>Scanning ID card...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Scan result display */}
        {scanResult && scanResult.success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg w-full max-w-md">
            <h3 className="font-medium text-green-800 mb-2">✓ Information Extracted Successfully</h3>
            <div className="space-y-1 text-sm text-green-700">
              {scanResult.name && <div><strong>Name:</strong> {scanResult.name}</div>}
              {scanResult.department && <div><strong>Department:</strong> {scanResult.department}</div>}
              {scanResult.batch && <div><strong>Batch:</strong> {scanResult.batch}</div>}
              {scanResult.studentId && <div><strong>Student ID:</strong> {scanResult.studentId}</div>}
            </div>
            <p className="mt-2 text-xs text-green-600">Redirecting to signup form...</p>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg w-full max-w-md">
            <h3 className="font-medium text-red-800 mb-2">✗ Scan Failed</h3>
            <p className="text-sm text-red-700">{error}</p>
            <p className="mt-2 text-xs text-red-600">
              Please ensure the ID card is clear and try again, or enter details manually.
            </p>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="px-6 py-2 rounded-lg font-medium bg-primary-lm text-text-lighter-lm border-[1.5px] border-stroke-grey hover:bg-stroke-grey transition cursor-pointer"
            disabled={isScanning}
          >
            Back
          </button>
          
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 bg-accent-lm hover:bg-hover-btn-lm text-primary-lm transition"
            style={{ 
              cursor: isScanning ? "not-allowed" : "pointer"
            }}
          >
            {isScanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Scanning...
              </>
            ) : (
              'Scan'
            )}
          </button>
        </div>
        
        {/* Debug info (can be removed in production) */}
        {scanResult?.rawText && (
          <details className="mt-6 w-full max-w-md text-sm">
            <summary className="cursor-pointer text-gray-500">Debug: OCR Raw Text</summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-gray-600 font-mono text-xs whitespace-pre-wrap">
              {scanResult.rawText}
            </div>
          </details>
        )}
        
        {/* Login link */}
        <div className="mt-6 text-sm text-text-lighter-lm">
          Already have an account?{" "}
          <Link to="/login" className="underline text-accent-lm">
            Login
          </Link>
        </div>
      </div>
    </SignupLoginBox>
  );
}