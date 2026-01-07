/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";
import { CalendarEvent, DiscordEventEntityType } from "../types";

const cl = classNameFactory("calendar-sync-");

interface EventDetailsProps {
    event: CalendarEvent;
    onClose: () => void;
    onOptIn: (event: CalendarEvent) => void;
    onOptOut: (event: CalendarEvent) => void;
}

export function EventDetails({ event, onClose, onOptIn, onOptOut }: EventDetailsProps) {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    const sourceColors = {
        discord: "var(--brand-experiment)",
        google: "#4285F4",
        outlook: "#0078D4",
    };
    
    const eventTypeLabels = {
        [DiscordEventEntityType.STAGE_INSTANCE]: "Stage Event",
        [DiscordEventEntityType.VOICE]: "Voice Event",
        [DiscordEventEntityType.EXTERNAL]: "External Event",
    };
    
    return (
        <div className={cl("event-details")}>
            <div className={cl("event-details-header")}>
                <h3>Event Details</h3>
                <button className={cl("close-btn")} onClick={onClose}>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
            
            <div className={cl("event-details-content")}>
                {/* Cover Image */}
                {event.coverImage && (
                    <div className={cl("event-details-cover")}>
                        <img src={event.coverImage} alt="" />
                    </div>
                )}
                
                {/* Source Badge */}
                <div 
                    className={cl("event-details-source")}
                    style={{ "--source-color": event.color || sourceColors[event.source] } as React.CSSProperties}
                >
                    {getSourceIcon(event.source)}
                    <span>{getSourceLabel(event)}</span>
                </div>
                
                {/* Title */}
                <h2 className={cl("event-details-title")}>{event.title}</h2>
                
                {/* Status Badge */}
                {event.source === "discord" && (
                    <div className={cl("event-details-status", event.status)}>
                        {event.status === "opted_in" ? (
                            <>
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                <span>You're going</span>
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <span>Not opted in</span>
                            </>
                        )}
                    </div>
                )}
                
                {/* Date & Time */}
                <div className={cl("event-details-section")}>
                    <div className={cl("event-details-row")}>
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                        </svg>
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
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>{event.location}</span>
                        </div>
                    </div>
                )}
                
                {/* Event Type (Discord) */}
                {event.entityType && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            {event.entityType === DiscordEventEntityType.VOICE ? (
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                                </svg>
                            ) : event.entityType === DiscordEventEntityType.STAGE_INSTANCE ? (
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M19.61 18.25a1.08 1.08 0 0 1-.07-1.33 9 9 0 1 0-15.07 0 1.08 1.08 0 0 1-.07 1.33l-.09.1a1 1 0 0 1-1.63-.39 11 11 0 1 1 18.53 0 1 1 0 0 1-1.63.39l-.09-.1H19.6zM12 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1"/>
                                </svg>
                            )}
                            <span>{eventTypeLabels[event.entityType] || "Event"}</span>
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
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
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
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            )}
                            <span>Created by {event.creatorName}</span>
                        </div>
                    </div>
                )}
                
                {/* Organizer (External) */}
                {event.organizer && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span>Organized by {event.organizer.name || event.organizer.email}</span>
                        </div>
                    </div>
                )}
                
                {/* Attendees Count */}
                {(event.interestedCount !== undefined || event.attendees) && (
                    <div className={cl("event-details-section")}>
                        <div className={cl("event-details-row")}>
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
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
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                                Not Interested
                            </button>
                        ) : (
                            <button 
                                className={cl("action-btn", "primary")}
                                onClick={() => onOptIn(event)}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                I'm Interested
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function getSourceIcon(source: string) {
    switch (source) {
        case "discord":
            return (
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02z"/>
                </svg>
            );
        case "google":
            return (
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            );
        case "outlook":
            return (
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.168v-6.09h2.168l.324-2.52h-2.492V8.59c0-.388.076-.68.228-.874.154-.194.422-.29.808-.29h1.328V5.2c-.458-.062-1.086-.092-1.882-.092-1.014 0-1.826.3-2.434.902-.608.6-.912 1.416-.912 2.448v1.606h-2.172v2.52h2.172v6.09H.832c-.23 0-.424-.08-.576-.234-.154-.152-.234-.346-.234-.576V7.387l11.5 6.326 12.478-6.326z"/>
                </svg>
            );
        default:
            return null;
    }
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

