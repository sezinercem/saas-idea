import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import { listAgencyNotifications, markNotificationRead } from "../../lib/portal";
import type { PortalNotification } from "../../types/portal";

export function NotificationBell() {
  const { notify } = useToast();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setNotifications(await listAgencyNotifications());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load notifications.", "error");
    }
  }, [notify]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const unread = notifications.filter((item) => !item.read_at).length;

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  return (
    <div className="relative">
      <Button variant="outline" className="relative h-10 px-3" onClick={() => setIsOpen((current) => !current)}>
        <Bell className="size-4" />
        {unread ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span> : null}
      </Button>
      {isOpen ? (
        <Card className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] p-0 shadow-xl">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? notifications.map((item) => (
              <button key={item.id} type="button" className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60" onClick={() => markRead(item.id)}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {!item.read_at ? <Badge tone="blue">New</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
              </button>
            )) : (
              <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
