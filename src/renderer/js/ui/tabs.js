/**
 * @fileoverview Tab Manager - 标签切换管理
 */

import { getElements, toggleClass, dispatchCustomEvent } from '../utils/dom-helpers.js';

export class TabManager {
    constructor(onModeChange) {
        this.tabBtns = getElements('.tab-btn');
        this.tabContents = getElements('.tab-content');
        this.currentMode = 'basic';
        this.onModeChange = onModeChange;
        this.setupEvents();
    }

    setupEvents() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn));
        });
    }

    switchTab(btn) {
        const targetMode = btn.dataset.tab;

        // If already on this tab, do nothing
        if (targetMode === this.currentMode) {
            return;
        }

        // Notify about mode change (this will trigger confirmation if needed)
        dispatchCustomEvent('mode-change-request', {
            from: this.currentMode,
            to: targetMode,
            onConfirm: () => this.performSwitch(btn, targetMode)
        });
    }

    performSwitch(btn, targetMode) {
        // Update Tab UI
        this.tabBtns.forEach(b => toggleClass(b, 'active', false));
        toggleClass(btn, 'active', true);

        // Update Content UI
        this.tabContents.forEach(c => toggleClass(c, 'active', false));
        const targetPanel = document.getElementById(`${targetMode}-panel`);
        if (targetPanel) {
            toggleClass(targetPanel, 'active', true);
        }

        this.currentMode = targetMode;

        // Notify mode change if callback provided
        if (typeof this.onModeChange === 'function') {
            this.onModeChange(targetMode);
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }
}
