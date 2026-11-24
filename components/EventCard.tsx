/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";

import { CalendarEvent } from "../types";
import { formatShortDate, formatTime, formatTimeRange, isSameDay } from "../utils/date";
import { sourceColor, sourceLabel } from "../utils/sources";
import { AccountCircleIcon, ClockIcon, LocationIcon, PeopleIcon, SourceIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

interface EventCardProps {
    event: CalendarEvent;
    compact?: boolean;
    onClick?: () => void;
}

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
    if (compact) {
        return (
            <button
                className={cl("event-card", "compact", event.status === "pending" && "pending")}
                style={sourceColor(event.source)}
                onClick={onClick}
            >
                <div className={cl("event-card-indicator")} />
                <div className={cl("event-card-content")}>
                    <span className={cl("event-card-title")}>{event.title}</span>
                    <span className={cl("event-card-time")}>
                        {formatEventRange(event)}
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
            style={sourceColor(event.source)}
            onClick={onClick}
        >
            <div className={cl("event-card-header")}>
                <div className={cl("event-card-indicator")} />
                <div className={cl("event-card-meta")}>
                    <span className={cl("event-card-source")}>
                        <SourceIcon source={event.source} size={14} />
                        <span>{sourceLabel(event)}</span>
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
                        <span>{formatEventRange(event)}</span>
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

function formatEventRange({ startTime, endTime, allDay }: CalendarEvent) {
    if (allDay) return "All day";

    return isSameDay(startTime, endTime)
        ? `${formatShortDate(startTime)} · ${formatTimeRange(startTime, endTime)}`
        : `${formatShortDate(startTime)} ${formatTime(startTime)} - ${formatShortDate(endTime)} ${formatTime(endTime)}`;
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
}

