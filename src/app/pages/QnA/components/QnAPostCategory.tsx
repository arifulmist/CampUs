export function QnAPostCategory({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
})
{
  return(
    <button
      type="button"
      onClick={onClick}
      className={`lg:transition lg:font-medium lg:px-4 lg:py-2 lg:rounded-lg cursor-pointer
        ${isSelected? "bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
      :"bg-primary-lm text-accent-lm hover:bg-hover-lm border border-stroke-grey hover:border-stroke-peach"}`
      }>
    {label}
    </button>
  );
}