/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";

import { EventFilters, EventSource } from "../types";
import { SOURCE_KEYS, sourceColor, SOURCES } from "../utils/sources";
import { SourceIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

interface CalendarFiltersProps {
    filters: EventFilters;
    counts: Record<EventSource, number>;
    onChange: (filters: EventFilters) => void;
}

export function CalendarFilters({ filters, counts, onChange }: CalendarFiltersProps) {
    return (
        <div className={cl("filters")}>
            <h3 className={cl("section-title")}>Calendars</h3>

            <div className={cl("filter-list")}>
                {SOURCE_KEYS.map(source => (
                    <label key={source} className={cl("filter-item")}>
                        <input
                            type="checkbox"
                            checked={filters.sources[source]}
                            onChange={e => onChange({ ...filters, sources: { ...filters.sources, [source]: e.target.checked } })}
                            className={cl("filter-checkbox")}
                        />
                        <span className={cl("filter-color")} style={sourceColor(source)} />
                        <span className={cl("filter-label")}>
                            <span className={cl("filter-name")}>{SOURCES[source].label}</span>
                            <span className={cl("filter-count")}>{counts[source]}</span>
                        </span>
                        <SourceIcon source={source} className={cl("filter-icon")} />
                    </label>
                ))}
            </div>

            <div className={cl("filter-divider")} />

            <h3 className={cl("section-title")}>Display Options</h3>

            <div className={cl("filter-list")}>
                <label className={cl("filter-item", "toggle")}>
                    <input
                        type="checkbox"
                        checked={filters.showPending}
                        onChange={e => onChange({ ...filters, showPending: e.target.checked })}
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
