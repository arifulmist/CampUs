import crossBtn from "../../../assets/icons/cross_btn.svg";

export function ShareModal()
{
  return (
    <div className="lg:w-60 lg:p-4 bg-primary-lm ring-stroke-grey lg:rounded-2xl">
      <div className="lg:flex lg:justify-end">
        <img src={crossBtn}></img>
      </div>
    </div>
  );
}