/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";
import type { ComponentType } from "react";

import { CalendarEvent, DiscordEventEntityType } from "../types";
import { AccountCircleIcon, CalendarIcon, CheckCircleIcon, CheckIcon, CloseIcon, IconProps, LocationIcon, MicIcon, PeopleIcon, PersonIcon, SourceIcon, StageIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

interface EventDetailsProps {
    event: CalendarEvent;
    onClose: () => void;
    onOptIn: (event: CalendarEvent) => void;
    onOptOut: (event: CalendarEvent) => void;
}

const ENTITY_TYPES: Record<DiscordEventEntityType, { label: string; Icon: ComponentType<IconProps>; }> = {
    [DiscordEventEntityType.STAGE_INSTANCE]: { label: "Stage Event", Icon: StageIcon },
    [DiscordEventEntityType.VOICE]: { label: "Voice Event", Icon: MicIcon },
    [DiscordEventEntityType.EXTERNAL]: { label: "External Event", Icon: CalendarIcon },
};

export function EventDetails({ event, onClose, onOptIn, onOptOut }: EventDetailsProps) {
    const entityType = event.entityType && ENTITY_TYPES[event.entityType];
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    const sourceColors = {
        discord: "var(--brand-experiment)",
        google: "#4285F4",
        outlook: "#0078D4",
    };

    return (
        <div className={cl("event-details")}>
            <div className={cl("event-details-header")}>
                <h3>Event Details</h3>
                <button className={cl("close-btn")} onClick={onClose}>
                    <CloseIcon size={18} />
                </button>
            </div>

            <div className={cl("event-details-content")}>
                {/* Cover Image */}
                {event.coverImage && (
                    <div className={cl("event-details-cover")}>
                        <img
                            src={event.coverImage}
                            alt={event.title}
                            loading="eager"
                            decoding="async"
                        />
                    </div>
                )}

                {/* Source Badge */}
                <div
                    className={cl("event-details-source")}
                    style={{ "--source-color": event.color || sourceColors[event.source] } as React.CSSProperties}
                >
                    <SourceIcon source={event.source} />
                    <span>{getSourceLabel(event)}</span>
                </div>

                {/* Title */}
                <h2 className={cl("event-details-title")}>{event.title}</h2>

                {/* Status Badge */}
                {event.source === "discord" && (
                    <div className={cl("event-details-status", event.status)}>
                        {event.status === "opted_in" ? (
                            <>
                                <CheckIcon size={14} />
                                <span>You're going</span>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon size={14} />
                                <span>Not opted in</span>
                            </>
                        )}
                    </div>
                )}

                {/* Date & Time */}
                <div className={cl("event-details-section")}>
                    <div className={cl("event-details-row")}>
                        <CalendarIcon size={18} />
                        <div className={cl("event-details-datetime")}>
                            <span className={cl("date")}>
                                {startTime.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric"
                                })}
                            </span>
                            {!event.allDay && (
                                <span className={cl("time")}>
                                    {startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                    {" - "}
                                    {endTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </span>
                            )}
                            {event.allDay && <span className={cl("time")}>All day</span>}
                        </div>
                    </div>
                </div>

                {/* Location */}
                {event.location && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            <LocationIcon size={18} />
                            <span>{event.location}</span>
                        </div>
                    </div>
                )}

                {/* Event Type (Discord) */}
                {entityType && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            <entityType.Icon size={18} />
                            <span>{entityType.label}</span>
                        </div>
                    </div>
                )}

                {/* Server (Discord) */}
                {event.guildName && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            {event.guildIcon ? (
                                <img
                                    src={event.guildIcon}
                                    alt=""
                                    className={cl("guild-icon")}
                                />
                            ) : (
                                <AccountCircleIcon size={18} />
                            )}
                            <span>{event.guildName}</span>
                        </div>
                    </div>
                )}

                {/* Creator (Discord) */}
                {event.creatorName && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            {event.creatorAvatar ? (
                                <img
                                    src={event.creatorAvatar}
                                    alt=""
                                    className={cl("creator-avatar")}
                                />
                            ) : (
                                <PersonIcon size={18} />
                            )}
                            <span>Created by {event.creatorName}</span>
                        </div>
                    </div>
                )}

                {/* Organizer (External) */}
                {event.organizer && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            <PersonIcon size={18} />
                            <span>Organized by {event.organizer.name || event.organizer.email}</span>
                        </div>
                    </div>
                )}

                {/* Attendees Count */}
                {(event.interestedCount !== undefined || event.attendees) && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            <PeopleIcon size={18} />
                            <span>
                                {event.interestedCount !== undefined
                                    ? `${event.interestedCount} interested`
                                    : `${event.attendees?.length || 0} attendees`
                                }
                            </span>
                        </div>
                    </div>
                )}

                {/* Attendees List (External) */}
                {event.attendees && event.attendees.length > 0 && (
                    <div className={cl("event-details-section")}>
                        <h4 className={cl("section-label")}>Attendees</h4>
                        <div className={cl("attendees-list")}>
                            {event.attendees.slice(0, 5).map((attendee, i) => (
                                <div key={i} className={cl("attendee")}>
                                    <span className={cl("attendee-name")}>{attendee.name || attendee.email}</span>
                                    {attendee.responseStatus && (
                                        <span className={cl("attendee-status", attendee.responseStatus)}>
                                            {attendee.responseStatus}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {event.attendees.length > 5 && (
                                <span className={cl("more-attendees")}>
                                    +{event.attendees.length - 5} more
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Description */}
                {event.description && (
                    <div className={cl("event-details-section")}>
                        <h4 className={cl("section-label")}>Description</h4>
                        <p className={cl("event-description")}>{event.description}</p>
                    </div>
                )}

                {/* Action Buttons (Discord only) */}
                {event.source === "discord" && (
                    <div className={cl("event-details-actions")}>
                        {event.status === "opted_in" ? (
                            <button
                                className={cl("action-btn", "secondary")}
                                onClick={() => onOptOut(event)}
                            >
                                <CloseIcon />
                                Not Interested
                            </button>
                        ) : (
                            <button
                                className={cl("action-btn", "primary")}
                                onClick={() => onOptIn(event)}
                            >
                                <CheckIcon />
                                I'm Interested
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
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

