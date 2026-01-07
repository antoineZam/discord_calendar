/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";
import { CalendarViewState } from "../types";

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
                    <DiscordIcon />
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
                    <GoogleIcon />
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
                    <OutlookIcon />
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

function DiscordIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" className={cl("filter-icon")}>
            <path fill="currentColor" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02z"/>
        </svg>
    );
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" className={cl("filter-icon")}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    );
}

function OutlookIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" className={cl("filter-icon")}>
            <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.168v-6.09h2.168l.324-2.52h-2.492V8.59c0-.388.076-.68.228-.874.154-.194.422-.29.808-.29h1.328V5.2c-.458-.062-1.086-.092-1.882-.092-1.014 0-1.826.3-2.434.902-.608.6-.912 1.416-.912 2.448v1.606h-2.172v2.52h2.172v6.09H.832c-.23 0-.424-.08-.576-.234-.154-.152-.234-.346-.234-.576V7.387l11.5 6.326 12.478-6.326z"/>
        </svg>
    );
}

