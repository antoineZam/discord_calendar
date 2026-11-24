/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    googleCalendarEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Google Calendar sync",
        default: false,
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
        description: "Outlook/Azure OAuth Client ID (required for Outlook)",
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
    optedInEvents: {
        type: OptionType.STRING,
        description: "List of opted-in Discord event IDs (JSON)",
        default: "[]",
        hidden: true,
    },
});
