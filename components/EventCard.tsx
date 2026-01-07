/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";
import { CalendarEvent } from "../types";

const cl = classNameFactory("calendar-sync-");

interface EventCardProps {
    event: CalendarEvent;
    compact?: boolean;
    onClick?: () => void;
}

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    const sourceIcons = {
        discord: (
            <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
            </svg>
        ),
        google: (
            <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
        ),
        outlook: (
            <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.168v-6.09h2.168l.324-2.52h-2.492V8.59c0-.388.076-.68.228-.874.154-.194.422-.29.808-.29h1.328V5.2c-.458-.062-1.086-.092-1.882-.092-1.014 0-1.826.3-2.434.902-.608.6-.912 1.416-.912 2.448v1.606h-2.172v2.52h2.172v6.09H.832c-.23 0-.424-.08-.576-.234-.154-.152-.234-.346-.234-.576V7.387l11.5 6.326 12.478-6.326z"/>
                <path fill="#0078D4" d="M23.16 5.426L12 11.387.84 5.426C.938 5.14 1.112 4.908 1.36 4.73c.248-.18.516-.268.806-.268h19.668c.29 0 .558.088.806.268.248.178.422.41.52.696z"/>
            </svg>
        ),
    };
    
    const sourceColors = {
        discord: "var(--brand-experiment)",
        google: "#4285F4",
        outlook: "#0078D4",
    };
    
    if (compact) {
        return (
            <button
                className={cl("event-card", "compact", event.status === "pending" && "pending")}
                style={{ "--event-color": event.color || sourceColors[event.source] } as React.CSSProperties}
                onClick={onClick}
            >
                <div className={cl("event-card-indicator")} />
                <div className={cl("event-card-content")}>
                    <span className={cl("event-card-title")}>{event.title}</span>
                    <span className={cl("event-card-time")}>
                        {formatEventTime(startTime, endTime, event.allDay)}
                    </span>
                </div>
                <span className={cl("event-card-source")}>
                    {sourceIcons[event.source]}
                </span>
            </button>
        );
    }
    
    return (
        <button
            className={cl("event-card", event.status === "pending" && "pending")}
            style={{ "--event-color": event.color || sourceColors[event.source] } as React.CSSProperties}
            onClick={onClick}
        >
            <div className={cl("event-card-header")}>
                <div className={cl("event-card-indicator")} />
                <div className={cl("event-card-meta")}>
                    <span className={cl("event-card-source")}>
                        {sourceIcons[event.source]}
                        <span>{getSourceLabel(event)}</span>
                    </span>
                    {event.status === "pending" && (
                        <span className={cl("event-card-status")}>Not opted in</span>
                    )}
                </div>
            </div>
            
            {event.coverImage && (
                <div className={cl("event-card-cover")}>
                    <img src={event.coverImage} alt="" />
                </div>
            )}
            
            <div className={cl("event-card-body")}>
                <h4 className={cl("event-card-title")}>{event.title}</h4>
                
                <div className={cl("event-card-info")}>
                    <div className={cl("event-card-row")}>
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                        </svg>
                        <span>{formatEventTime(startTime, endTime, event.allDay)}</span>
                    </div>
                    
                    {event.location && (
                        <div className={cl("event-card-row")}>
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>{event.location}</span>
                        </div>
                    )}
                    
                    {event.guildName && (
                        <div className={cl("event-card-row")}>
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                            </svg>
                            <span>{event.guildName}</span>
                        </div>
                    )}
                    
                    {event.interestedCount !== undefined && (
                        <div className={cl("event-card-row")}>
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
                            <span>{event.interestedCount} interested</span>
                        </div>
                    )}
                </div>
                
                {event.description && (
                    <p className={cl("event-card-description")}>
                        {truncateText(event.description, 150)}
                    </p>
                )}
            </div>
        </button>
    );
}

function formatEventTime(start: Date, end: Date, allDay?: boolean): string {
    if (allDay) {
        return "All day";
    }
    
    const sameDay = start.toDateString() === end.toDateString();
    const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
    const dateOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    
    if (sameDay) {
        return `${start.toLocaleDateString(undefined, dateOptions)} · ${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleTimeString(undefined, timeOptions)}`;
    }
    
    return `${start.toLocaleDateString(undefined, dateOptions)} ${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleDateString(undefined, dateOptions)} ${end.toLocaleTimeString(undefined, timeOptions)}`;
}

function getSourceLabel(event: CalendarEvent): string {
    switch (event.source) {
        case "discord":
            return event.guildName || "Discord Event";
        case "google":
            return event.calendarName || "Google Calendar";
        case "outlook":
            return event.calendarName || "Outlook Calendar";
        default:
            return "Event";
    }
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
}

