import type { ReactNode } from "react";
import signupIllustration from "@/assets/images/SignupImg.svg";

export function SignupLoginBox({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="lg:min-h-screen lg:flex lg:items-center lg:justify-center">      
      <div className="lg:flex lg:flex-row lg:mx-10 lg:my-8 bg-secondary-lm lg:rounded-3xl lg:shadow-lg lg:shadow-stroke-grey lg:w-[85vw] lg:max-w-350 lg:h-165">
        
        {/* Left section */}
        <div className="lg:px-12 lg:py-8 lg:flex lg:flex-col lg:justify-center lg:gap-3 lg:w-1/2 lg:overflow-y-auto">
          <p className="text-text-lm text-xl lg:font-[Poppins] lg:font-medium">
            {title}
          </p>
          {children}
        </div>

        {/* Right section */}
        <div className="lg:overflow-hidden lg:w-1/2 lg:rounded-3xl">
          <img
            src={signupIllustration}
            alt="Signup Illustration"
            className="lg:object-cover lg:w-full lg:h-full"
          />
        </div>

      </div>
    </div>
  );
}
