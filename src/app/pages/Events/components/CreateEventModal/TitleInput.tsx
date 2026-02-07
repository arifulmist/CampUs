interface Props { value: string; error: boolean; onChange: (v:string)=>void; }
export default function TitleInput({value,error,onChange}:Props){
  return (
    <div>
      <h3 className="lg:mb-2 text-lg lg:font-medium">Title</h3>
      <input
        className={`w-full border border-stroke-grey rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#C23D00] ${error?"border-red-500":""}`}
        placeholder="Enter event title"
        value={value}
        onChange={e=>onChange(e.target.value)}
      />
      {error && <p className="text-sm text-red-600 lg:mt-1">Title field is mandatory.</p>}
    </div>
  );
}
