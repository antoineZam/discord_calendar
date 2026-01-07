/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps, findByCode } from "@webpack";
import { React, FluxDispatcher } from "@webpack/common";

// Store for toolbar buttons
const toolbarButtons: Map<string, React.ComponentType> = new Map();

// Toolbar header bar component
let HeaderBarContainer: any = null;

export function addToolbarButton(id: string, component: React.ComponentType) {
    toolbarButtons.set(id, component);
    triggerRerender();
}

export function removeToolbarButton(id: string) {
    toolbarButtons.delete(id);
    triggerRerender();
}

export function getToolbarButtons(): Map<string, React.ComponentType> {
    return toolbarButtons;
}

function triggerRerender() {
    // Trigger a rerender of the header bar by dispatching a custom event
    try {
        FluxDispatcher.dispatch({ type: "CALENDAR_SYNC_TOOLBAR_UPDATE" });
    } catch (e) {
        // Fallback: no-op if dispatch fails
    }
}

// Patch the header bar to include our buttons
export function patchToolbar() {
    // This is a simplified version - in a real implementation you'd use
    // Vencord's patching system to inject the button into the header bar
    
    const ChannelHeader = findByProps("Title", "Divider", "Icon");
    if (!ChannelHeader) return;
    
    // The actual patching would be done using Vencord's Patcher API
    // For now, we'll use the toolbox actions feature which is built-in
}

// Alternative: Use CSS injection to style the toolbar button
export const toolbarButtonStyles = `
.calendar-sync-toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 4px;
    border: none;
    background: none;
    color: var(--interactive-normal);
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.15s ease, background-color 0.15s ease;
}

.calendar-sync-toolbar-button:hover {
    color: var(--interactive-hover);
    background-color: var(--background-modifier-hover);
}

.calendar-sync-toolbar-button:active {
    color: var(--interactive-active);
}

.calendar-sync-toolbar-icon {
    width: 20px;
    height: 20px;
}
`;

