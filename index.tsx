/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Tooltip } from "@webpack/common";
import type { PropsWithChildren } from "react";

import { openCalendarModal } from "./components/CalendarModal";
import { CalendarManager } from "./utils/CalendarManager";
import { OAuthManager } from "./utils/OAuthManager";

// Find Discord's HeaderBarIcon component
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

export const settings = definePluginSettings({
    googleCalendarEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Google Calendar sync",
        default: false,
    },
    googleClientId: {
        type: OptionType.STRING,
        description: "Google OAuth Client ID",
        default: "",
    },
    googleRefreshToken: {
        type: OptionType.STRING,
        description: "Google OAuth Refresh Token (auto-filled after auth)",
        default: "",
        hidden: true,
    },
    outlookCalendarEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Outlook Calendar sync",
        default: false,
    },
    outlookClientId: {
        type: OptionType.STRING,
        description: "Outlook/Azure OAuth Client ID",
        default: "",
    },
    outlookRefreshToken: {
        type: OptionType.STRING,
        description: "Outlook OAuth Refresh Token (auto-filled after auth)",
        default: "",
        hidden: true,
    },
    discordEventsEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show Discord server events",
        default: true,
    },
    showPendingEvents: {
        type: OptionType.BOOLEAN,
        description: "Show events you haven't opted into (lower opacity)",
        default: true,
    },
    defaultCalendarView: {
        type: OptionType.SELECT,
        description: "Default calendar view",
        options: [
            { label: "Month", value: "month", default: true },
            { label: "Week", value: "week" },
            { label: "Day", value: "day" },
            { label: "Agenda", value: "agenda" },
        ],
    },
    syncIntervalMinutes: {
        type: OptionType.SLIDER,
        description: "Sync interval (minutes)",
        default: 15,
        markers: [5, 10, 15, 30, 60],
        stickToMarkers: true,
    },
    eventSources: {
        type: OptionType.STRING,
        description: "Enabled event sources (JSON)",
        default: "{}",
        hidden: true,
    },
    optedInEvents: {
        type: OptionType.STRING,
        description: "List of opted-in Discord event IDs (JSON)",
        default: "[]",
        hidden: true,
    },
});

export let calendarManager: CalendarManager;
export let oauthManager: OAuthManager;

// Calendar Icon SVG
function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" width={24} height={24} className="vc-calendar-icon">
            <path
                fill="currentColor"
                d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"
            />
        </svg>
    );
}

// Calendar Header Bar Button
function CalendarHeaderButton({ className }: { className: string }) {
    return (
        <HeaderBarIcon
            className={`vc-calendar-btn ${className}`}
            onClick={openCalendarModal}
            tooltip="Calendar"
            icon={CalendarIcon}
        />
    );
}

export default definePlugin({
    name: "CalendarSync",
    description: "Sync Outlook and Google Calendar events with Discord server events in a unified calendar view",
    authors: [Devs.Ven], // Replace with your dev info

    settings,

    // This adds the action to the Vencord toolbox menu
    toolboxActions: {
        "Open Calendar": openCalendarModal,
    },

    // Patch to add calendar icon to the header bar (same location as VencordToolbox)
    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50})\i\.Fragment,\{(?=.+?className:(\i))/,
                replace: "$self.TrailingWrapper,{className:$1,"
            }
        }
    ],

    // Wrapper component that adds our calendar button
    TrailingWrapper({ children, className }: PropsWithChildren<{ className: string }>) {
        return (
            <>
                {children}
                <ErrorBoundary noop>
                    <CalendarHeaderButton className={className} />
                </ErrorBoundary>
            </>
        );
    },

    start() {
        // Initialize managers
        calendarManager = new CalendarManager(settings);
        oauthManager = new OAuthManager(settings);

        // Start background sync
        calendarManager.startSync();

        console.log("[CalendarSync] Plugin started");
    },

    stop() {
        // Stop background sync
        if (calendarManager) {
            calendarManager.stopSync();
        }

        console.log("[CalendarSync] Plugin stopped");
    },
});
