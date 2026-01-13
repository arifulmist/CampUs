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
    <div className="w-fit">
      {disableClick ? (
        <div className="flex gap-2 pointer-events-none">
          <div className="user-img">
            <img
              src={userImg}
              className="rounded-full size-9 border-[1.5px] border-accent-lm"
            ></img>
          </div>
          <div className="flex flex-col">
            <p className="text-base text-accent-lm font-[Poppins] font-medium">
              {userName}
            </p>
            <p className="text-sm text-accent-lm font-[Poppins] font-normal">
              {userBatch}
            </p>
          </div>
        </div>
      ) : (
        <Link
          to={userId ? `/profile/${userId}` : "/profile"}
          className="flex gap-2 cursor-pointer"
        >
          <div className="user-img">
            <img
              src={userImg}
              className="rounded-full size-9 border-[1.5px] border-accent-lm"
            ></img>
          </div>
          <div className="flex flex-col">
            <p className="text-base text-accent-lm font-[Poppins] font-medium">
              {userName}
            </p>
            <p className="text-sm text-accent-lm font-[Poppins] font-normal">
              {userBatch}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
