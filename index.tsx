/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { openCalendarModal } from "./components/CalendarModal";
import { CalendarManager } from "./utils/CalendarManager";
import { OAuthManager } from "./utils/OAuthManager";

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

export default definePlugin({
    name: "CalendarSync",
    description: "Sync Outlook and Google Calendar events with Discord server events in a unified calendar view",
    authors: [Devs.Ven], // Replace with your dev info
    
    settings,
    
    toolboxActions: {
        "Open Calendar": openCalendarModal,
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

