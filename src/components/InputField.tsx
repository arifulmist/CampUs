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
	<div className="flex flex-col relative">
		<label htmlFor={name} className="block text-text-lm text-md font-medium my-0">
			{label}
		</label>
		<div className="relative">
			<input 
				name={name}
				id={name} 
				type={type} 
				placeholder={placeholder} 
				value={value} 
				onChange={changeHandler} 
				required={required}
				className="bg-primary-lm border border-stroke-grey rounded-lg w-full h-10 text-base text-text-lighter-lm font-normal px-3 focus:outline-accent-lm" />

			{rightSlot &&
			<div className="absolute right-12 top-0 h-full flex items-center">
				{rightSlot}
			</div>	
				}
		</div>
	</div>
  );
}

