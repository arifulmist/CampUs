import type { MouseEventHandler } from "react";

export function ButtonCTA({label, disabled, clickEvent, type="button"}:{
  label:string,
  type?: "button" | "submit" | "reset", 
  disabled?:boolean,
  clickEvent?: MouseEventHandler<HTMLButtonElement>})
{
  return (
    <button type={type} onClick={clickEvent} disabled={disabled} className="bg-accent-lm hover:bg-hover-btn-lm transition text-primary-lm text-base font-medium w-fit px-4 py-2 rounded-lg cursor-pointer">{label}</button>
  );
}