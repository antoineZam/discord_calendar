/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React, useState } from "@webpack/common";
import { settings, oauthManager } from "../index";

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
            await oauthManager.authenticateGoogle();
            setGoogleAuthStatus("connected");
        } catch (err) {
            console.error("[CalendarSync] Google auth failed:", err);
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
            await oauthManager.authenticateOutlook();
            setOutlookAuthStatus("connected");
        } catch (err) {
            console.error("[CalendarSync] Outlook auth failed:", err);
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
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
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
                            disabled={googleAuthStatus === "connecting" || !settings.store.googleClientId}
                        >
                            {googleAuthStatus === "connected" ? "Disconnect" : 
                             googleAuthStatus === "connecting" ? "..." : "Connect"}
                        </button>
                    </div>
                    {!settings.store.googleClientId && (
                        <p className={cl("connection-warning")}>
                            Please enter your Google OAuth Client ID above to connect.
                        </p>
                    )}
                </div>

                {/* Outlook Calendar Connection */}
                <div className={cl("connection-card")}>
                    <div className={cl("connection-header")}>
                        <div className={cl("connection-icon", "outlook")}>
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.168v-6.09h2.168l.324-2.52h-2.492V8.59c0-.388.076-.68.228-.874.154-.194.422-.29.808-.29h1.328V5.2c-.458-.062-1.086-.092-1.882-.092-1.014 0-1.826.3-2.434.902-.608.6-.912 1.416-.912 2.448v1.606h-2.172v2.52h2.172v6.09H.832c-.23 0-.424-.08-.576-.234-.154-.152-.234-.346-.234-.576V7.387l11.5 6.326 12.478-6.326z"/>
                                <path fill="#0078D4" d="M23.16 5.426L12 11.387.84 5.426C.938 5.14 1.112 4.908 1.36 4.73c.248-.18.516-.268.806-.268h19.668c.29 0 .558.088.806.268.248.178.422.41.52.696z"/>
                            </svg>
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
                            Please enter your Outlook/Azure OAuth Client ID above to connect.
                        </p>
                    )}
                </div>
            </div>

            <div className={cl("section")}>
                <h3 className={cl("section-title")}>Setup Instructions</h3>
                
                <div className={cl("instructions")}>
                    <div className={cl("instruction-card")}>
                        <h4>Google Calendar Setup</h4>
                        <ol>
                            <li>Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
                            <li>Create a new project or select an existing one</li>
                            <li>Enable the Google Calendar API</li>
                            <li>Go to Credentials → Create Credentials → OAuth Client ID</li>
                            <li>Application type: Web application</li>
                            <li>Add redirect URI: <code>http://localhost:38420/callback</code></li>
                            <li>Copy the Client ID and paste it in the settings above</li>
                        </ol>
                    </div>

                    <div className={cl("instruction-card")}>
                        <h4>Outlook Calendar Setup</h4>
                        <ol>
                            <li>Go to <a href="https://portal.azure.com/" target="_blank">Azure Portal</a></li>
                            <li>Navigate to Azure Active Directory → App registrations</li>
                            <li>Click "New registration"</li>
                            <li>Add redirect URI: <code>http://localhost:38420/callback</code></li>
                            <li>Under API permissions, add <code>Calendars.Read</code></li>
                            <li>Copy the Application (client) ID and paste it in the settings above</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}

