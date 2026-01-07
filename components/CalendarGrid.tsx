/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";
import { CalendarEvent, CalendarViewState } from "../types";
import { EventCard } from "./EventCard";

const cl = classNameFactory("calendar-sync-");

interface CalendarGridProps {
    view: CalendarViewState["view"];
    currentDate: Date;
    events: CalendarEvent[];
    selectedEvent: CalendarEvent | null;
    onSelectEvent: (event: CalendarEvent | null) => void;
}

export function CalendarGrid({ view, currentDate, events, selectedEvent, onSelectEvent }: CalendarGridProps) {
    switch (view) {
        case "month":
            return <MonthView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        case "week":
            return <WeekView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        case "day":
            return <DayView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        case "agenda":
            return <AgendaView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        default:
            return <MonthView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
    }
}

// Month View Component
function MonthView({ 
    currentDate, 
    events, 
    onSelectEvent 
}: { 
    currentDate: Date; 
    events: CalendarEvent[]; 
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = getWeekStart(monthStart);
    
    const weeks: Date[][] = [];
    let current = new Date(startDate);
    
    while (current <= monthEnd || weeks.length < 6) {
        const week: Date[] = [];
        for (let i = 0; i < 7; i++) {
            week.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
        if (weeks.length >= 6) break;
    }
    
    const today = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    return (
        <div className={cl("month-view")}>
            <div className={cl("month-header")}>
                {dayNames.map(day => (
                    <div key={day} className={cl("month-day-header")}>{day}</div>
                ))}
            </div>
            <div className={cl("month-grid")}>
                {weeks.map((week, wi) => (
                    <div key={wi} className={cl("month-week")}>
                        {week.map((day, di) => {
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isToday = isSameDay(day, today);
                            const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
                            
                            return (
                                <div
                                    key={di}
                                    className={cl(
                                        "month-day",
                                        !isCurrentMonth && "other-month",
                                        isToday && "today"
                                    )}
                                >
                                    <div className={cl("day-number", isToday && "today")}>
                                        {day.getDate()}
                                    </div>
                                    <div className={cl("day-events")}>
                                        {dayEvents.slice(0, 3).map(event => (
                                            <EventPill
                                                key={event.id}
                                                event={event}
                                                onClick={() => onSelectEvent(event)}
                                            />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className={cl("more-events")}>
                                                +{dayEvents.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Week View Component
function WeekView({ 
    currentDate, 
    events, 
    onSelectEvent 
}: { 
    currentDate: Date; 
    events: CalendarEvent[]; 
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const weekStart = getWeekStart(currentDate);
    const days: Date[] = [];
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        days.push(day);
    }
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const today = new Date();
    
    return (
        <div className={cl("week-view")}>
            <div className={cl("week-header")}>
                <div className={cl("time-gutter")} />
                {days.map((day, i) => (
                    <div
                        key={i}
                        className={cl("week-day-header", isSameDay(day, today) && "today")}
                    >
                        <span className={cl("day-name")}>
                            {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                        <span className={cl("day-number", isSameDay(day, today) && "today")}>
                            {day.getDate()}
                        </span>
                    </div>
                ))}
            </div>
            <div className={cl("week-grid")}>
                <div className={cl("time-column")}>
                    {hours.map(hour => (
                        <div key={hour} className={cl("time-slot")}>
                            <span className={cl("time-label")}>
                                {formatHour(hour)}
                            </span>
                        </div>
                    ))}
                </div>
                <div className={cl("week-days")}>
                    {days.map((day, di) => (
                        <div key={di} className={cl("week-day-column")}>
                            {hours.map(hour => (
                                <div key={hour} className={cl("hour-cell")} />
                            ))}
                            {/* Render events for this day */}
                            {events
                                .filter(e => isSameDay(new Date(e.startTime), day))
                                .map(event => (
                                    <WeekEventBlock
                                        key={event.id}
                                        event={event}
                                        onClick={() => onSelectEvent(event)}
                                    />
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Day View Component
function DayView({ 
    currentDate, 
    events, 
    onSelectEvent 
}: { 
    currentDate: Date; 
    events: CalendarEvent[]; 
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), currentDate));
    const today = new Date();
    const isToday = isSameDay(currentDate, today);
    
    return (
        <div className={cl("day-view")}>
            <div className={cl("day-header")}>
                <h2 className={cl("day-title", isToday && "today")}>
                    {currentDate.toLocaleDateString(undefined, { 
                        weekday: "long", 
                        month: "long", 
                        day: "numeric" 
                    })}
                </h2>
                {isToday && <span className={cl("today-badge")}>Today</span>}
            </div>
            <div className={cl("day-grid")}>
                <div className={cl("time-column")}>
                    {hours.map(hour => (
                        <div key={hour} className={cl("time-slot")}>
                            <span className={cl("time-label")}>
                                {formatHour(hour)}
                            </span>
                        </div>
                    ))}
                </div>
                <div className={cl("day-events-column")}>
                    {hours.map(hour => (
                        <div key={hour} className={cl("hour-cell")} />
                    ))}
                    {dayEvents.map(event => (
                        <DayEventBlock
                            key={event.id}
                            event={event}
                            onClick={() => onSelectEvent(event)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Agenda View Component
function AgendaView({ 
    currentDate, 
    events, 
    onSelectEvent 
}: { 
    currentDate: Date; 
    events: CalendarEvent[]; 
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const upcomingEvents = events
        .filter(e => new Date(e.startTime) >= currentDate)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // Group events by date
    const groupedEvents: Map<string, CalendarEvent[]> = new Map();
    
    upcomingEvents.forEach(event => {
        const dateKey = new Date(event.startTime).toDateString();
        if (!groupedEvents.has(dateKey)) {
            groupedEvents.set(dateKey, []);
        }
        groupedEvents.get(dateKey)!.push(event);
    });
    
    const today = new Date();
    
    return (
        <div className={cl("agenda-view")}>
            {upcomingEvents.length === 0 ? (
                <div className={cl("no-events")}>
                    <svg viewBox="0 0 24 24" width="48" height="48">
                        <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                    </svg>
                    <p>No upcoming events</p>
                </div>
            ) : (
                Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => {
                    const date = new Date(dateKey);
                    const isToday = isSameDay(date, today);
                    const isTomorrow = isSameDay(date, new Date(today.getTime() + 86400000));
                    
                    let dateLabel = date.toLocaleDateString(undefined, { 
                        weekday: "long", 
                        month: "long", 
                        day: "numeric" 
                    });
                    
                    if (isToday) dateLabel = `Today · ${dateLabel}`;
                    else if (isTomorrow) dateLabel = `Tomorrow · ${dateLabel}`;
                    
                    return (
                        <div key={dateKey} className={cl("agenda-day")}>
                            <div className={cl("agenda-date", isToday && "today")}>
                                {dateLabel}
                            </div>
                            <div className={cl("agenda-events")}>
                                {dayEvents.map(event => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        onClick={() => onSelectEvent(event)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// Event Pill for Month View
function EventPill({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
    const sourceColors = {
        discord: "var(--brand-experiment)",
        google: "#4285F4",
        outlook: "#0078D4",
    };
    
    return (
        <button
            className={cl("event-pill", event.status === "pending" && "pending")}
            style={{ 
                "--event-color": event.color || sourceColors[event.source] 
            } as React.CSSProperties}
            onClick={onClick}
        >
            <span className={cl("event-pill-dot")} />
            <span className={cl("event-pill-title")}>{event.title}</span>
        </button>
    );
}

// Event Block for Week View
function WeekEventBlock({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    const top = (startMinutes / 60) * 48; // 48px per hour
    const height = Math.max((duration / 60) * 48, 24);
    
    const sourceColors = {
        discord: "var(--brand-experiment)",
        google: "#4285F4",
        outlook: "#0078D4",
    };
    
    return (
        <button
            className={cl("week-event-block", event.status === "pending" && "pending")}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                "--event-color": event.color || sourceColors[event.source],
            } as React.CSSProperties}
            onClick={onClick}
        >
            <span className={cl("event-block-time")}>
                {startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
            <span className={cl("event-block-title")}>{event.title}</span>
        </button>
    );
}

// Event Block for Day View
function DayEventBlock({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    const top = (startMinutes / 60) * 48;
    const height = Math.max((duration / 60) * 48, 32);
    
    const sourceColors = {
        discord: "var(--brand-experiment)",
        google: "#4285F4",
        outlook: "#0078D4",
    };
    
    return (
        <button
            className={cl("day-event-block", event.status === "pending" && "pending")}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                "--event-color": event.color || sourceColors[event.source],
            } as React.CSSProperties}
            onClick={onClick}
        >
            <div className={cl("event-block-content")}>
                <span className={cl("event-block-title")}>{event.title}</span>
                <span className={cl("event-block-time")}>
                    {startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {" - "}
                    {endTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
                {event.location && (
                    <span className={cl("event-block-location")}>{event.location}</span>
                )}
            </div>
        </button>
    );
}

// Helper functions
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

