/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CalendarEvent, CalendarView } from "../types";

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;

/** Building an Intl formatter is costly, so each format is built once and reused. */
function formatter(options: Intl.DateTimeFormatOptions) {
    const { format } = new Intl.DateTimeFormat(undefined, options);
    return format;
}

export const formatTime = formatter({ hour: "numeric", minute: "2-digit" });
export const formatShortDate = formatter({ month: "short", day: "numeric" });
export const formatMediumDate = formatter({ month: "short", day: "numeric", year: "numeric" });
export const formatLongDate = formatter({ weekday: "long", month: "long", day: "numeric" });
export const formatFullDate = formatter({ weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const formatMonthYear = formatter({ month: "long", year: "numeric" });

const formatHour = formatter({ hour: "numeric" });
export const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => formatHour(new Date(2000, 0, 1, hour)));

export const formatTimeRange = (start: Date, end: Date) => `${formatTime(start)} - ${formatTime(end)}`;

/** Calendar arithmetic (rather than adding milliseconds) keeps days aligned across DST changes. */
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const startOfWeek = (date: Date) => addDays(date, -date.getDay());
export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

/** Identifies the local calendar day of a date, for use as a map key. */
export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export type EventsByDay = Map<string, CalendarEvent[]>;

/** Groups events by the day they start on, keeping their order. */
export function groupByDay(events: CalendarEvent[]): EventsByDay {
    const days: EventsByDay = new Map();
    for (const event of events) {
        const key = dayKey(event.startTime);
        const group = days.get(key);
        if (group) group.push(event);
        else days.set(key, [event]);
    }
    return days;
}

/** The seven days of the week containing `date`, starting on Sunday. */
export function getWeekDays(date: Date) {
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, day) => addDays(start, day));
}

/** The six weeks displayed for the month containing `date`. */
export function getMonthWeeks(date: Date) {
    const start = startOfWeek(startOfMonth(date));
    return Array.from({ length: 6 }, (_, week) => getWeekDays(addDays(start, week * 7)));
}

const weekdayNames = (weekday: "long" | "short" | "narrow") => getWeekDays(new Date(2000, 0, 2)).map(formatter({ weekday }));

/** Localized weekday names, indexed like `Date#getDay()`. */
export const WEEKDAY_NAMES = { long: weekdayNames("long"), short: weekdayNames("short"), narrow: weekdayNames("narrow") };

/** Moves one page backward or forward. Months land on the 1st so that Jan 31 + 1 month is not March. */
export function shiftDate(date: Date, view: CalendarView, direction: 1 | -1) {
    switch (view) {
        case "month": return new Date(date.getFullYear(), date.getMonth() + direction, 1);
        case "day": return addDays(date, direction);
        default: return addDays(date, 7 * direction);
    }
}
