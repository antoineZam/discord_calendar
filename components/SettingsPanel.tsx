/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React, useState } from "@webpack/common";

import { settings } from "../settings";
import { logger } from "../utils/logger";
import { authenticate } from "../utils/OAuthManager";
import { GoogleIcon, OutlookIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-settings-");

export function SettingsPanel() {
    const [googleAuthStatus, setGoogleAuthStatus] = useState<"disconnected" | "connecting" | "connected">(
        settings.store.googleRefreshToken ? "connected" : "disconnected"
    );
    const [outlookAuthStatus, setOutlookAuthStatus] = useState<"disconnected" | "connecting" | "connected">(
        settings.store.outlookRefreshToken ? "connected" : "disconnected"
    );

    async function handleGoogleAuth() {
        if (googleAuthStatus === "connected") {
            // Disconnect
            settings.store.googleRefreshToken = "";
            setGoogleAuthStatus("disconnected");
            return;
        }

        setGoogleAuthStatus("connecting");
        try {
            await authenticate("google");
            setGoogleAuthStatus("connected");
        } catch (err) {
            logger.error("Google auth failed:", err);
            setGoogleAuthStatus("disconnected");
        }
    }

    async function handleOutlookAuth() {
        if (outlookAuthStatus === "connected") {
            // Disconnect
            settings.store.outlookRefreshToken = "";
            setOutlookAuthStatus("disconnected");
            return;
        }

        setOutlookAuthStatus("connecting");
        try {
            await authenticate("outlook");
            setOutlookAuthStatus("connected");
        } catch (err) {
            logger.error("Outlook auth failed:", err);
            setOutlookAuthStatus("disconnected");
        }
    }

    return (
        <div className={cl("panel")}>
            <div className={cl("section")}>
                <h3 className={cl("section-title")}>Calendar Connections</h3>
                <p className={cl("section-description")}>
                    Connect your external calendars to see all your events in one place.
                </p>

                {/* Google Calendar Connection */}
                <div className={cl("connection-card")}>
                    <div className={cl("connection-header")}>
                        <div className={cl("connection-icon", "google")}>
                            <GoogleIcon size={24} />
                        </div>
                        <div className={cl("connection-info")}>
                            <h4>Google Calendar</h4>
                            <span className={cl("connection-status", googleAuthStatus)}>
                                {googleAuthStatus === "connected" ? "Connected" :
                                 googleAuthStatus === "connecting" ? "Connecting..." : "Not connected"}
                            </span>
                        </div>
                        <button
                            className={cl("connection-btn", googleAuthStatus === "connected" ? "disconnect" : "connect")}
                            onClick={handleGoogleAuth}
                            disabled={googleAuthStatus === "connecting"}
                        >
                            {googleAuthStatus === "connected" ? "Disconnect" :
                             googleAuthStatus === "connecting" ? "..." : "Connect"}
                        </button>
                    </div>
                </div>

                {/* Outlook Calendar Connection */}
                <div className={cl("connection-card")}>
                    <div className={cl("connection-header")}>
                        <div className={cl("connection-icon", "outlook")}>
                            <OutlookIcon size={24} />
                        </div>
                        <div className={cl("connection-info")}>
                            <h4>Outlook Calendar</h4>
                            <span className={cl("connection-status", outlookAuthStatus)}>
                                {outlookAuthStatus === "connected" ? "Connected" :
                                 outlookAuthStatus === "connecting" ? "Connecting..." : "Not connected"}
                            </span>
                        </div>
                        <button
                            className={cl("connection-btn", outlookAuthStatus === "connected" ? "disconnect" : "connect")}
                            onClick={handleOutlookAuth}
                            disabled={outlookAuthStatus === "connecting" || !settings.store.outlookClientId}
                        >
                            {outlookAuthStatus === "connected" ? "Disconnect" :
                             outlookAuthStatus === "connecting" ? "..." : "Connect"}
                        </button>
                    </div>
                    {!settings.store.outlookClientId && (
                        <p className={cl("connection-warning")}>
                            Enter your Outlook/Azure OAuth Client ID in the settings below to connect.
                        </p>
                    )}
                </div>
            </div>

            <div className={cl("section")}>
                <h3 className={cl("section-title")}>Setup Instructions</h3>

                <div className={cl("instructions")}>
                    <div className={cl("instruction-card")}>
                        <h4>Google Calendar</h4>
                        <p>Click "Connect" above to sign in with your Google account. Your calendar events will be synced automatically.</p>
                    </div>

                    <div className={cl("instruction-card")}>
                        <h4>Outlook Calendar Setup</h4>
                        <p>Outlook requires an Azure App registration:</p>
                        <ol>
                            <li>Go to <a href="https://portal.azure.com/" target="_blank" rel="noreferrer">Azure Portal</a></li>
                            <li>Navigate to Azure Active Directory → App registrations</li>
                            <li>Click "New registration"</li>
                            <li>Add redirect URI: <code>https://login.microsoftonline.com/common/oauth2/nativeclient</code></li>
                            <li>Under API permissions, add <code>Calendars.Read</code></li>
                            <li>Copy the Application (client) ID to the plugin settings</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}

