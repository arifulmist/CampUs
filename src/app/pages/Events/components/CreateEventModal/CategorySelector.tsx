interface Props { category: string; onChange: (v: any) => void; }
export default function CategorySelector({ category, onChange }: Props) {
  return (
    <div className="lg:flex lg:gap-6">
      {["Workshop","Seminar","Course","Competition"].map(c => (
        <label key={c} className="lg:flex lg:items-center lg:gap-2">
          <input type="radio" checked={category===c.toLowerCase()} onChange={()=>onChange(c.toLowerCase())} 
           className="accent-accent-lm"/>
           <span>{c}</span>
        </label>
      ))}
    </div>
  );
}
