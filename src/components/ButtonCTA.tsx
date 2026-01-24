import type { MouseEventHandler } from "react";

export function ButtonCTA({label, disabled, clickEvent, type="button"}:{
  label:string,
  type?: "button" | "submit" | "reset", 
  disabled?:boolean,
  clickEvent?: MouseEventHandler<HTMLButtonElement>})
{
  return (
    <button type={type} onClick={clickEvent} disabled={disabled} className="bg-accent-lm hover:bg-hover-btn-lm lg:transition text-primary-lm text-base lg:font-medium lg:w-fit lg:px-4 lg:py-2 lg:rounded-lg cursor-pointer">{label}</button>
  );
}