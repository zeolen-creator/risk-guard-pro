import { useState } from "react";
import { Bell, X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useRiskAlerts, useDismissAlert, useMarkAlertRead, RiskAlert } from "@/hooks/useRiskAlerts";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

function AlertItem({
  alert,
  onDismiss,
  onMarkRead,
}: {
  alert: RiskAlert;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-4 border-red-600 bg-red-50 dark:bg-red-950";
      case "high":
        return "border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950";
      case "medium":
        return "border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      default:
        return "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950";
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div
      className={`p-4 ${getSeverityColor(alert.severity)} ${!alert.is_read ? "font-medium" : ""}`}
      onClick={() => !alert.is_read && onMarkRead(alert.id)}
    >
      <div className="flex items-start gap-3">
        {getAlertIcon(alert.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">{alert.title}</p>
            <Badge
              variant={alert.severity === "critical" ? "destructive" : "secondary"}
              className="text-xs flex-shrink-0"
            >
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{alert.description}</p>
          {alert.action_required && (
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Action required: {alert.action_required}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(alert.id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AlertList({
  alerts,
  onDismiss,
  onMarkRead,
}: {
  alerts: RiskAlert[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
        <p className="font-medium">No new alerts</p>
        <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
}

export function RiskAlertsWidget() {
  const { data: alerts = [] } = useRiskAlerts();
  const dismissAlert = useDismissAlert();
  const markAsRead = useMarkAlertRead();
  const [showSheet, setShowSheet] = useState(false);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const handleDismiss = (id: string) => {
    dismissAlert.mutate(id);
  };

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  return (
    <>
      {/* Desktop */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="hidden md:flex">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-600">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <DropdownMenuLabel className="flex items-center justify-between">
            Risk Alerts
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-96">
            <AlertList alerts={alerts} onDismiss={handleDismiss} onMarkRead={handleMarkRead} />
          </ScrollArea>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/alerts" className="w-full text-center">
              View All Alerts
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="relative md:hidden"
        onClick={() => setShowSheet(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-600">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              Risk Alerts
              {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <AlertList alerts={alerts} onDismiss={handleDismiss} onMarkRead={handleMarkRead} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
