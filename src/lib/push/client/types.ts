export interface BrowserPushState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  subscribing: boolean;
}
