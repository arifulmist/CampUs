import { ButtonCTA } from "@/components/ButtonCTA";
import SearchIcon from "@/assets/icons/search_icon.svg";

export function SearchAddPostBar({
  value,
  onChange,
  onNewPostClick,
}: {
  value: string;
  onChange: (next: string) => void;
  onNewPostClick?: () => void;
})
{
  return (
    <div className="flex justify-between bg-primary-lm lg:p-1.5 lg:rounded-xl w-full border border-stroke-grey focus-within:border-stroke-peach">
      <div className="flex gap-2 items-center w-[90%] lg:ml-2">
        <img src={SearchIcon} className="lg:size-6"></img>
        <input
        type="text"
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-text-lm placeholder:text-stroke-peach focus:outline-0 h-full w-full"
        />
      </div>
      <ButtonCTA
      label="New Post"
      clickEvent={onNewPostClick}
      ></ButtonCTA>
    </div>
  );  
}