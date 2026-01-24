import { Link } from "react-router";
interface UserDetails {
  userImg: string;
  userName: string;
  userBatch: string;
  userId?: string;
  disableClick?: boolean;
}
export function UserInfo({
  userImg,
  userName,
  userBatch,
  userId,
  disableClick,
}: UserDetails) {
  return (
    <div className="lg:w-fit">
      {disableClick ? (
        <div className="lg:flex lg:gap-2 lg:pointer-events-none">
          <div className="lg:user-img">
            <img
              src={userImg}
              className="lg:rounded-full lg:size-9 border-[1.5px] border-accent-lm"
            ></img>
          </div>
          <div className="lg:flex lg:flex-col">
            <p className="text-base text-accent-lm lg:font-[Poppins] lg:font-medium">
              {userName}
            </p>
            <p className="text-sm text-accent-lm lg:font-[Poppins] lg:font-normal">
              {userBatch}
            </p>
          </div>
        </div>
      ) : (
        <Link
          to={userId ? `/profile/${userId}` : "/profile"}
          className="lg:flex lg:gap-2 cursor-pointer"
        >
          <div className="lg:user-img">
            <img
              src={userImg}
              className="lg:rounded-full lg:size-9 border-[1.5px] border-accent-lm"
            ></img>
          </div>
          <div className="lg:flex lg:flex-col">
            <p className="text-base text-accent-lm lg:font-[Poppins] lg:font-medium">
              {userName}
            </p>
            <p className="text-sm text-accent-lm lg:font-[Poppins] lg:font-normal">
              {userBatch}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
