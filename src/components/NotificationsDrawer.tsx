import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Link } from "react-router";
import { Bell, MessageCircle, Heart, Users } from "lucide-react";
import {
  type NotificationItem,
  subscribe,
  clearCurrentEvent,
} from "../mockData/notifications";

function TypeIcon({ type }: { type: NotificationItem["type"] }) {
  const className="lg:h-4 lg:w-4 text-accent-lm";
  switch (type) {
    case "event":
      return <Bell className={className} />;
    case "qna":
      return <MessageCircle className={className} />;
    case "collab":
      return <Users className={className} />;
    case "lostfound":
      return <Heart className={className} />;
    default:
      return <Bell className={className} />;
  }
}

export function NotificationsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [currentEvent, setCurrentEvent] = useState<NotificationItem | null>(
    null
  );

  useEffect(() => {
    const unsub = subscribe(
      ({
        items,
        currentEvent,
      }: {
        items: NotificationItem[];
        currentEvent: NotificationItem | null;
      }) => {
        setItems(items);
        setCurrentEvent(currentEvent);
      }
    );
    return () => {
      unsub();
    };
  }, []);

  // Match MessageDrawer sizing and positioning
  const NAVBAR_HEIGHT = 105;
  const NAVBAR_SPACING = 15;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="bg-primary-lm text-text-lm lg:fixed lg:right-0 lg:w-95 sm:w-95 sm:max-w-95 border-l border-stroke-grey"
        style={{
          top: NAVBAR_HEIGHT + NAVBAR_SPACING,
          height: `calc(100vh - ${NAVBAR_HEIGHT + NAVBAR_SPACING}px)`,
        }}
      >
        <DrawerHeader className="border-b border-stroke-grey bg-secondary-lm">
          <DrawerTitle className="text-accent-lm lg:font-semibold">
            Notifications
          </DrawerTitle>
          <DrawerDescription className="text-text-lighter-lm">
            Stay updated with events and new posts
          </DrawerDescription>
        </DrawerHeader>

        <div className="lg:p-4 lg:flex lg:flex-col lg:gap-4 lg:h-full lg:overflow-y-auto">
          {currentEvent && (
            <div className="lg:rounded-lg lg:border border-stroke-peach bg-secondary-lm lg:p-3">
              <div className="lg:flex lg:items-start lg:gap-2">
                <TypeIcon type={currentEvent.type} />
                <div className="lg:flex-1">
                  <div className="lg:font-medium text-text-lm">
                    {currentEvent.title}
                  </div>
                  {currentEvent.description && (
                    <div className="text-sm text-text-lighter-lm lg:mt-0.5">
                      {currentEvent.description}
                    </div>
                  )}
                  <div className="text-xs text-text-lighter-lm lg:mt-1">
                    {new Date(currentEvent.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="lg:mt-3 lg:flex lg:items-center lg:gap-2">
                {currentEvent.path ? (
                  <Link
                    to={currentEvent.path}
                    onClick={() => onOpenChange(false)}
                  >
                    <Button className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm lg:h-8 lg:px-3">
                      Open
                    </Button>
                  </Link>
                ) : null}
                <Button
                  variant="outline"
                  className="border-stroke-grey text-text-lm lg:h-8 lg:px-3"
                  onClick={() => clearCurrentEvent()}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {currentEvent ? <Separator className="border-stroke-grey" /> : null}

          <div className="lg:flex lg:flex-col lg:gap-2">
            {items.length === 0 && (
              <div className="text-text-lighter-lm text-sm">
                No notifications yet
              </div>
            )}
            {items.map((it) => (
              <Link
                to={it.path || "#"}
                key={it.id}
                onClick={() => it.path && onOpenChange(false)}
              >
                <div className="lg:rounded-lg lg:border border-stroke-grey hover:border-stroke-peach bg-primary-lm hover:bg-secondary-lm lg:p-3 lg:transition">
                  <div className="lg:flex lg:items-start lg:gap-2">
                    <TypeIcon type={it.type} />
                    <div className="lg:flex-1">
                      <div className="lg:font-medium text-text-lm">{it.title}</div>
                      {it.description && (
                        <div className="text-sm text-text-lighter-lm lg:mt-0.5 lg:line-clamp-2">
                          {it.description}
                        </div>
                      )}
                      <div className="text-xs text-text-lighter-lm lg:mt-1">
                        {new Date(it.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:px-4 lg:pb-4">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="lg:w-full border-stroke-grey text-text-lm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default NotificationsDrawer;
