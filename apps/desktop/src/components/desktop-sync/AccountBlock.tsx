import type { DesktopAccount } from "../../lib/mockFilmwaveApi";

type AccountBlockProps = {
  account: DesktopAccount | null;
  accountDescription: string;
  accountLoading: boolean;
  connectionCode: string;
  isSignedIn: boolean;
  onConnectionCodeChange: (value: string) => void;
  onConnect: () => void;
  onOpenSignIn: () => void;
  onSignOut: () => void;
};

function getAccountInitial(account: DesktopAccount | null) {
  const value = account?.name || account?.email || "F";
  return value.trim().charAt(0).toUpperCase() || "F";
}

export default function AccountBlock({
  account,
  accountDescription,
  accountLoading,
  connectionCode,
  isSignedIn,
  onConnectionCodeChange,
  onConnect,
  onOpenSignIn,
  onSignOut,
}: AccountBlockProps) {
  return (
    <div className="settings-row account-settings-row">
      <div className="settings-row-label">
        <h2>Account</h2>
        <p>{accountDescription}</p>
        {!isSignedIn && (
          <div className="token-form">
            <input
              type="password"
              value={connectionCode}
              onChange={(event) => onConnectionCodeChange(event.target.value)}
              placeholder="Paste connection code"
              autoComplete="off"
            />
            <button
              type="button"
              className="secondary-button"
              onClick={onConnect}
            >
              Connect
            </button>
          </div>
        )}
        {isSignedIn && (
          <div className="account-profile-card">
            <div className="account-avatar">
              {account?.imageUrl ? (
                <img src={account.imageUrl} alt="" />
              ) : (
                getAccountInitial(account)
              )}
            </div>
            <div className="account-profile-main">
              <span className="account-name">
                {account?.name ?? (accountLoading ? "Loading..." : "Filmwave user")}
              </span>
              <span className="account-email">
                {account?.email ?? "Connected to Filmwave"}
              </span>
              <span className="account-connected-line">
                <span className="account-connected-dot" />
                Filmwave account connected
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="settings-row-control account-actions">
        <button type="button" className="primary-button" onClick={onOpenSignIn}>
          {isSignedIn ? "Reconnect" : "Sign in"}
        </button>
        {isSignedIn && (
          <button type="button" className="secondary-button" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
