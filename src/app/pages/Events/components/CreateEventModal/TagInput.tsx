interface Props { value:string; tags:string[]; onChange:(v:string)=>void; onAdd:()=>void; }
export default function TagInput({value,tags,onChange,onAdd}:Props){
  return (
    <div>
      <h3 className="lg:mb-2 text-lg text-text-lm lg:font-medium">Tags</h3>
      <div className="lg:flex lg:gap-2 lg:mb-3">{tags.map(t=><span key={t} className="lg:border border-accent-lm text-accent-lm lg:rounded-full lg:px-3 lg:py-1 text-sm">#{t}</span>)}</div>
      <div className="lg:flex lg:gap-2 lg:items-center">
        <input value={value} onChange={e=>onChange(e.target.value)} className="lg:flex-1 lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2" placeholder="Add tag (press Add)"/>
        <button onClick={onAdd} className="bg-accent-lm text-primary-lm lg:px-3 lg:py-2 lg:rounded-lg" style={{color:"white"}}>Add</button>
      </div>
    </div>
  );
}
