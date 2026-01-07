/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React, Tooltip } from "@webpack/common";
import { openCalendarModal } from "./CalendarModal";

const cl = classNameFactory("calendar-sync-");

export function CalendarToolbarButton() {
    return (
        <Tooltip text="Calendar">
            {({ onMouseEnter, onMouseLeave }) => (
                <button
                    className={cl("toolbar-button")}
                    onClick={openCalendarModal}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    <svg 
                        viewBox="0 0 24 24" 
                        width="24" 
                        height="24"
                        className={cl("toolbar-icon")}
                    >
                        <path 
                            fill="currentColor" 
                            d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"
                        />
                    </svg>
                </button>
            )}
        </Tooltip>
    );
}

