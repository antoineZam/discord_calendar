/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { useState } from "@webpack/common";

import { settings } from "../settings";
import { logger } from "../utils/logger";
import { authenticate } from "../utils/OAuthManager";
import { Provider, PROVIDER_KEYS, PROVIDERS } from "../utils/providers";
import { SOURCES } from "../utils/sources";
import { SourceIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-settings-");

type Status = "connected" | "connecting" | "disconnected";

const STATUS_TEXT: Record<Status, { label: string; action: string; }> = {
    connected: { label: "Connected", action: "Disconnect" },
    connecting: { label: "Connecting...", action: "..." },
    disconnected: { label: "Not connected", action: "Connect" },
};

function ConnectionCard({ provider }: { provider: Provider; }) {
    const { tokenKey, clientId } = PROVIDERS[provider];
    const { label } = SOURCES[provider];
    const store = settings.use([tokenKey, "outlookClientId"]);
    const [connecting, setConnecting] = useState(false);

    const status: Status = connecting ? "connecting" : store[tokenKey] ? "connected" : "disconnected";
    const missingClientId = status === "disconnected" && !clientId();

    async function toggleConnection() {
        if (status === "connected") {
            settings.store[tokenKey] = "";
            return;
        }

        setConnecting(true);
        try {
            await authenticate(provider);
        } catch (err) {
            logger.warn(`${label} was not connected:`, err);
        } finally {
            setConnecting(false);
        }
    }

    return (
        <div className={cl("connection-card")}>
            <div className={cl("connection-header")}>
                <div className={cl("connection-icon", provider)}>
                    <SourceIcon source={provider} size={24} />
                </div>
                <div className={cl("connection-info")}>
                    <h4>{label}</h4>
                    <span className={cl("connection-status", status)}>{STATUS_TEXT[status].label}</span>
                </div>
                <button
                    className={cl("connection-btn", status === "connected" ? "disconnect" : "connect")}
                    onClick={toggleConnection}
                    disabled={status === "connecting" || missingClientId}
                >
                    {STATUS_TEXT[status].action}
                </button>
            </div>
            {missingClientId && (
                <p className={cl("connection-warning")}>
                    Enter your OAuth client ID in the settings below to connect.
                </p>
            )}
        </div>
    );
}

export function SettingsPanel() {
    return (
        <div className={cl("panel")}>
            <div className={cl("section")}>
                <h3 className={cl("section-title")}>Calendar Connections</h3>
                <p className={cl("section-description")}>
                    Connect your external calendars to see all your events in one place.
                </p>

                {PROVIDER_KEYS.map(provider => <ConnectionCard key={provider} provider={provider} />)}
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
