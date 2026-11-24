/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";

import { CalendarEvent } from "../types";
import { AccountCircleIcon, ClockIcon, LocationIcon, PeopleIcon, SourceIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

interface EventCardProps {
    event: CalendarEvent;
    compact?: boolean;
    onClick?: () => void;
}

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

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
                    <SourceIcon source={event.source} size={14} />
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
                        <SourceIcon source={event.source} size={14} />
                        <span>{getSourceLabel(event)}</span>
                    </span>
                    {event.status === "pending" && (
                        <span className={cl("event-card-status")}>Not opted in</span>
                    )}
                </div>
            </div>

            {event.coverImage && (
                <div className={cl("event-card-cover")}>
                    <img
                        src={event.coverImage}
                        alt={event.title}
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            )}

            <div className={cl("event-card-body")}>
                <h4 className={cl("event-card-title")}>{event.title}</h4>

                <div className={cl("event-card-info")}>
                    <div className={cl("event-card-row")}>
                        <ClockIcon size={14} />
                        <span>{formatEventTime(startTime, endTime, event.allDay)}</span>
                    </div>

                    {event.location && (
                        <div className={cl("event-card-row")}>
                            <LocationIcon size={14} />
                            <span>{event.location}</span>
                        </div>
                    )}

                    {event.guildName && (
                        <div className={cl("event-card-row")}>
                            <AccountCircleIcon size={14} />
                            <span>{event.guildName}</span>
                        </div>
                    )}

                    {event.interestedCount !== undefined && (
                        <div className={cl("event-card-row")}>
                            <PeopleIcon size={14} />
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

