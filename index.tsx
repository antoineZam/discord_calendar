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
import { CalendarIcon } from "./components/Icons";
import { SettingsPanel } from "./components/SettingsPanel";
import { settings } from "./settings";
import { calendarManager } from "./utils/CalendarManager";

// Find Discord's HeaderBarIcon component
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

// HeaderBarIcon passes its own props to the icon, which our icon does not understand
const HeaderIcon = () => <CalendarIcon size={24} className="vc-calendar-icon" />;

// Calendar Header Bar Button
function CalendarHeaderButton({ className }: { className: string }) {
    return (
        <HeaderBarIcon
            className={`vc-calendar-btn ${className}`}
            onClick={openCalendarModal}
            tooltip="Calendar"
            icon={HeaderIcon}
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
    },

    stop() {
        calendarManager.stopSync();
    },
});
