/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import type { PropsWithChildren } from "react";

import { openCalendarModal } from "./components/CalendarModal";
import { SettingsPanel } from "./components/SettingsPanel";
import { settings } from "./settings";
import { calendarManager } from "./utils/CalendarManager";

// Find Discord's HeaderBarIcon component
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

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
    settingsAboutComponent: SettingsPanel,

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
        calendarManager.startSync();

        console.log("[CalendarSync] Plugin started");
    },

    stop() {
        calendarManager.stopSync();

        console.log("[CalendarSync] Plugin stopped");
    },
});
