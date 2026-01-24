import errorImg from "@/assets/images/error404.svg"
import { ButtonCTA } from "@/components/ButtonCTA";
import { Link } from "react-router";

export function NotFound()
{
  return (
    <div className="lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-3">
      <img src={errorImg}></img>
      <h3 className="lg:font-header text-accent-lm lg:font-semibold lg:-mb-3">Error 404</h3>
      <h5 className="text-text-lm lg:font-medium">The page you were looking for does not exist</h5>
      <Link to="/home" className="lg:mt-4">
        <ButtonCTA label="Return Home"></ButtonCTA>
      </Link>
    </div>
  ); 
}