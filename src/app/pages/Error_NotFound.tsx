import errorImg from "@/assets/images/error404.svg"
import { ButtonCTA } from "@/components/ButtonCTA";
import { Link } from "react-router";

export function NotFound()
{
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <img src={errorImg}></img>
      <h3 className="font-header text-accent-lm font-semibold -mb-3">Error 404</h3>
      <h5 className="text-text-lm font-medium">The page you were looking for does not exist</h5>
      <Link to="/home" className="mt-4">
        <ButtonCTA label="Return Home"></ButtonCTA>
      </Link>
    </div>
  ); 
}