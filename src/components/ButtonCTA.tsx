import type { MouseEventHandler } from "react";
import { Spinner } from "./ui/spinner";

export function ButtonCTA({label, disabled, loading, clickEvent, type="button"}:{
  label:string,
  type?: "button" | "submit" | "reset", 
  disabled?:boolean,
  loading?: boolean,
  clickEvent?: MouseEventHandler<HTMLButtonElement>})
{
  return (
    <button
      type={type}
      onClick={clickEvent}
      disabled={disabled || loading}
      className="bg-accent-lm hover:bg-hover-btn-lm lg:transition text-primary-lm text-base lg:font-medium lg:w-fit lg:px-4 lg:py-2 lg:rounded-lg cursor-pointer disabled:opacity-60"
    >
      <span className="inline-flex items-center gap-2">
        {loading ? <Spinner className="text-primary-lm" /> : null}
        {label}
      </span>
    </button>
  );
}