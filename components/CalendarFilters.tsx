/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";

import { CalendarViewState } from "../types";
import { DiscordIcon, GoogleIcon, OutlookIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

interface CalendarFiltersProps {
    filters: CalendarViewState["filters"];
    onUpdateFilter: (key: keyof CalendarViewState["filters"], value: boolean) => void;
    eventCounts: {
        discord: number;
        google: number;
        outlook: number;
    };
}

export function CalendarFilters({ filters, onUpdateFilter, eventCounts }: CalendarFiltersProps) {
    return (
        <div className={cl("filters")}>
            <h3 className={cl("section-title")}>Calendars</h3>

            <div className={cl("filter-list")}>
                {/* Discord Events */}
                <label className={cl("filter-item")}>
                    <input
                        type="checkbox"
                        checked={filters.showDiscord}
                        onChange={e => onUpdateFilter("showDiscord", e.target.checked)}
                        className={cl("filter-checkbox")}
                    />
                    <span
                        className={cl("filter-color")}
                        style={{ "--filter-color": "var(--brand-experiment)" } as React.CSSProperties}
                    />
                    <span className={cl("filter-label")}>
                        <span className={cl("filter-name")}>Discord Events</span>
                        <span className={cl("filter-count")}>{eventCounts.discord}</span>
                    </span>
                    <DiscordIcon className={cl("filter-icon")} />
                </label>

                {/* Google Calendar */}
                <label className={cl("filter-item")}>
                    <input
                        type="checkbox"
                        checked={filters.showGoogle}
                        onChange={e => onUpdateFilter("showGoogle", e.target.checked)}
                        className={cl("filter-checkbox")}
                    />
                    <span
                        className={cl("filter-color")}
                        style={{ "--filter-color": "#4285F4" } as React.CSSProperties}
                    />
                    <span className={cl("filter-label")}>
                        <span className={cl("filter-name")}>Google Calendar</span>
                        <span className={cl("filter-count")}>{eventCounts.google}</span>
                    </span>
                    <GoogleIcon className={cl("filter-icon")} />
                </label>

                {/* Outlook Calendar */}
                <label className={cl("filter-item")}>
                    <input
                        type="checkbox"
                        checked={filters.showOutlook}
                        onChange={e => onUpdateFilter("showOutlook", e.target.checked)}
                        className={cl("filter-checkbox")}
                    />
                    <span
                        className={cl("filter-color")}
                        style={{ "--filter-color": "#0078D4" } as React.CSSProperties}
                    />
                    <span className={cl("filter-label")}>
                        <span className={cl("filter-name")}>Outlook Calendar</span>
                        <span className={cl("filter-count")}>{eventCounts.outlook}</span>
                    </span>
                    <OutlookIcon className={cl("filter-icon")} />
                </label>
            </div>

            <div className={cl("filter-divider")} />

            <h3 className={cl("section-title")}>Display Options</h3>

            <div className={cl("filter-list")}>
                {/* Show Pending Events */}
                <label className={cl("filter-item", "toggle")}>
                    <input
                        type="checkbox"
                        checked={filters.showPending}
                        onChange={e => onUpdateFilter("showPending", e.target.checked)}
                        className={cl("filter-checkbox")}
                    />
                    <span className={cl("filter-toggle")}>
                        <span className={cl("toggle-track")} />
                        <span className={cl("toggle-thumb")} />
                    </span>
                    <span className={cl("filter-label")}>
                        <span className={cl("filter-name")}>Show pending events</span>
                        <span className={cl("filter-description")}>
                            Display events you haven't opted into
                        </span>
                    </span>
                </label>
            </div>
        </div>
    );
}
