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

import { openCalendarModal } from "./components/CalendarModal";
import { CalendarIcon } from "./components/Icons";
import { SettingsPanel } from "./components/SettingsPanel";
import { settings } from "./settings";
import { calendarManager } from "./utils/CalendarManager";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

// HeaderBarIcon passes its own props to the icon, which our icon does not understand
const HeaderIcon = () => <CalendarIcon size={24} className="vc-calendar-icon" />;

function CalendarHeaderButton() {
    return (
        <HeaderBarIcon
            className="vc-calendar-btn"
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

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                // Prepend to the trailing children rather than wrapping them, which VencordToolbox already does
                match: /(trailing:.{0,150}?\{children:\[)/,
                replace: "$1$self.renderHeaderButton(),"
            }
        }
    ],

    renderHeaderButton: () => (
        <ErrorBoundary noop>
            <CalendarHeaderButton />
        </ErrorBoundary>
    ),

    start() {
        calendarManager.start();
    },

    stop() {
        calendarManager.stop();
    },
});
