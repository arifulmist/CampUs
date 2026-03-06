import type { ChangeEventHandler } from "react"

interface InputProps
{
  label:string, 
	name: string,
  placeholder?:string, 
	type: string,
 
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onCopy?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  value: string | number,
	required?: boolean | undefined
  changeHandler?: ChangeEventHandler<HTMLInputElement>
	rightSlot?: React.ReactNode;
}

export function InputField({label, placeholder, value, type, name, changeHandler, rightSlot, required=true}:InputProps)
{
	return (
	<div className="lg:flex lg:flex-col lg:relative">
		<label htmlFor={name} className="lg:block text-text-lm text-md lg:font-medium lg:my-0">
			{label}
		</label>
		<div className="lg:relative">
			<input 
				name={name}
				id={name} 
				type={type} 
				placeholder={placeholder} 
				value={value} 
				onChange={changeHandler} 
				required={required}
				className="bg-primary-lm lg:border border-stroke-grey lg:rounded-lg lg:w-full lg:h-10 text-base text-text-lighter-lm lg:font-normal lg:px-3 focus:outline-accent-lm" />

			{rightSlot &&
			<div className="lg:absolute lg:right-12 lg:top-0 lg:h-full lg:flex lg:items-center">
				{rightSlot}
			</div>	
				}
		</div>
	</div>
  );
}

