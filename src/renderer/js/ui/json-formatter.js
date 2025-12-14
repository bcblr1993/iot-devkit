/**
 * @fileoverview JSON Formatter UI Component (Split View)
 * Handles JSON formatting, minification, validation, and Tree View rendering.
 */

import { getElement } from '../utils/dom-helpers.js';

export class JsonFormatterUI {
    constructor() {
        this.inputEl = null;
        this.treeViewEl = null;
        this.statusBarEl = null;
        this.formatBtn = null;
        this.minifyBtn = null;
        this.copyBtn = null;
        this.clearBtn = null;

        this.debounceTimer = null;

        this.initializeElements();
        this.setupEventListeners();
        this.setupSearchListeners();
    }

    initializeElements() {
        this.inputEl = getElement('json-input');
        this.treeViewEl = getElement('json-tree-view');
        this.statusBarEl = getElement('json-status-bar');
        this.formatBtn = getElement('json-format-btn');
        this.minifyBtn = getElement('json-minify-btn');
        this.copyBtn = getElement('json-copy-btn');
        this.clearBtn = getElement('json-clear-btn');

        // Restore state immediately after initialization
        this.loadFromStorage();
    }

    // New Persistence Methods
    saveToStorage(content) {
        try {
            localStorage.setItem('iot-devkit:json-content', content);
        } catch (e) {
            console.error('Failed to save JSON content:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('iot-devkit:json-content');
            if (saved && this.inputEl) {
                this.inputEl.value = saved;
                // Defer tree update slightly to ensure DOM is ready if needed, 
                // though usually synchronous is fine here.
                this.updateTree();
            }
        } catch (e) {
            console.error('Failed to load JSON content:', e);
        }
    }

    clearStorage() {
        localStorage.removeItem('iot-devkit:json-content');
    }

    setupEventListeners() {
        // Format
        if (this.formatBtn) {
            this.formatBtn.addEventListener('click', () => {
                this.formatJson();
                this.updateTree(); // Force update tree after format
                this.saveToStorage(this.inputEl.value); // Save formatted
            });
        }

        // Minify
        if (this.minifyBtn) {
            this.minifyBtn.addEventListener('click', () => {
                this.minifyJson();
                this.updateTree(); // Force update tree after minify
                this.saveToStorage(this.inputEl.value); // Save minified
            });
        }

        // Clear
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                if (this.inputEl) {
                    this.inputEl.value = '';
                    this.inputEl.focus();
                    this.treeViewEl.innerHTML = '<div class="placeholder-text">请在左侧输入 JSON 数据</div>';
                    this.updateStatus('Ready', 'info');
                }
                this.clearStorage(); // Clear storage
            });
        }

        // Copy Input
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                if (this.inputEl) {
                    this.copyToClipboard(this.inputEl.value);
                }
            });
        }

        // Live Preview (Debounced)
        if (this.inputEl) {
            this.inputEl.addEventListener('input', () => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.updateTree();
                }, 500); // 500ms delay
            });
        }

        // Expand/Collapse All
        const expandBtn = getElement('btn-expand-all');
        const collapseBtn = getElement('btn-collapse-all');

        if (expandBtn) {
            expandBtn.addEventListener('click', () => this.expandAll());
        }

        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => this.collapseAll());
        }
    }

    expandAll() {
        if (!this.treeViewEl) return;
        const details = this.treeViewEl.querySelectorAll('details');
        details.forEach(el => el.open = true);
    }

    collapseAll() {
        if (!this.treeViewEl) return;
        const details = this.treeViewEl.querySelectorAll('details');
        details.forEach(el => el.open = false);
        // Optionally keep the root level open if desired, but "Collapse All" usually means all.
        // If we want to keep root open:
        // if (this.treeViewEl.firstElementChild && this.treeViewEl.firstElementChild.tagName === 'DETAILS') {
        //     this.treeViewEl.firstElementChild.open = true;
        // }
    }

    /**
     * Parse and render logic
     */
    updateTree() {
        const text = this.inputEl?.value || '';
        if (!text.trim()) {
            this.treeViewEl.innerHTML = '<div class="placeholder-text">请在左侧输入 JSON 数据</div>';
            this.updateStatus('Ready', 'info');
            return;
        }

        try {
            const data = JSON.parse(text);

            // Clear previous content
            this.treeViewEl.innerHTML = '';

            // Render new tree
            const treeRoot = this.createTreeElement(data, 'root');
            this.treeViewEl.appendChild(treeRoot);

            this.updateStatus('Valid JSON', 'success');
        } catch (e) {
            // Keep the previous tree if possible, or show error? 
            // Better to show error in status bar, maybe overlay?
            // For now, just status bar.
            this.updateStatus(`Syntax Error: ${e.message}`, 'error');
        }
    }

    /**
     * Recursive Tree Renderer
     */
    createTreeElement(data, key = null) {
        const type = this.getType(data);

        // Complex Types (Object / Array)
        if (type === 'Object' || type === 'Array') {
            const details = document.createElement('details');
            details.open = true; // Default open

            const summary = document.createElement('summary');
            summary.classList.add('tree-row');

            // Key Label
            if (key !== null && key !== 'root') {
                const keySpan = document.createElement('span');
                keySpan.className = 'jv-key';
                keySpan.textContent = `"${key}": `;
                summary.appendChild(keySpan);
            }

            // Bracket Start
            const startBracket = document.createElement('span');
            startBracket.className = 'jv-punctuation';
            startBracket.textContent = type === 'Array' ? '[' : '{';
            summary.appendChild(startBracket);

            // Size hint (optional)
            const size = Object.keys(data).length;
            const sizeHint = document.createElement('span');
            sizeHint.style.color = '#666';
            sizeHint.style.fontSize = '11px';
            sizeHint.textContent = ` ${size} items `;
            summary.appendChild(sizeHint);

            details.appendChild(summary);

            // Children Container
            const childrenContainer = document.createElement('div');

            // Recursively add children
            Object.keys(data).forEach(k => {
                const childEl = this.createTreeElement(data[k], k);
                childrenContainer.appendChild(childEl);
            });

            details.appendChild(childrenContainer);

            // Closing Bracket (as a separate div at the end of details)
            // But HTML details structure is linear.
            // We append a simple div for closing bracket at the end of children container
            const endBracket = document.createElement('div');
            endBracket.style.marginLeft = '10px';
            endBracket.className = 'jv-punctuation';
            endBracket.textContent = type === 'Array' ? ']' : '}';
            details.appendChild(endBracket);

            return details;
        }

        // Primitive Types
        else {
            const div = document.createElement('div');
            div.classList.add('tree-row');
            div.style.marginLeft = '22px'; // Indent to match summary text

            // Key
            if (key !== null) {
                const keySpan = document.createElement('span');
                keySpan.className = 'jv-key';
                keySpan.textContent = `"${key}": `;
                div.appendChild(keySpan);
            }

            // Value
            const valueSpan = document.createElement('span');
            valueSpan.className = `jv-${type.toLowerCase()}`;

            if (type === 'String') {
                valueSpan.textContent = `"${data}"`;
            } else {
                valueSpan.textContent = String(data);
            }
            div.appendChild(valueSpan);

            return div;
        }
    }

    getType(value) {
        if (value === null) return 'Null';
        if (Array.isArray(value)) return 'Array';
        if (typeof value === 'object') return 'Object';
        if (typeof value === 'string') return 'String';
        if (typeof value === 'number') return 'Number';
        if (typeof value === 'boolean') return 'Boolean';
        return 'String';
    }

    /**
     * Helpers
     */
    parseJson() {
        const text = this.inputEl?.value || '';
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }

    formatJson() {
        const data = this.parseJson();
        if (data) {
            this.inputEl.value = JSON.stringify(data, null, 4);
            this.updateStatus('Formatted', 'success');
        }
    }

    minifyJson() {
        const data = this.parseJson();
        if (data) {
            this.inputEl.value = JSON.stringify(data);
            this.updateStatus('Minified', 'success');
        }
    }

    updateStatus(message, type = 'info') {
        if (!this.statusBarEl) return;

        const iconMap = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌'
        };

        const iconEl = this.statusBarEl.querySelector('.status-icon');
        const textEl = this.statusBarEl.querySelector('.status-text');

        if (iconEl) iconEl.textContent = iconMap[type] || 'ℹ️';
        if (textEl) textEl.textContent = message;

        this.statusBarEl.className = 'status-bar';
        if (type !== 'info') {
            this.statusBarEl.classList.add(type);
        }
    }

    async copyToClipboard(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '✓ 已复制';
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
            }, 1500);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }

    /* =========================================================================================
       Search Functionality
       ========================================================================================= */

    setupSearchListeners() {
        this.searchInputEl = getElement('json-search-input');
        this.searchCountEl = getElement('json-search-count');
        this.searchPrevBtn = getElement('json-search-prev');
        this.searchNextBtn = getElement('json-search-next');

        this.searchResults = [];
        this.currentSearchIndex = -1;

        if (this.searchInputEl) {
            this.searchInputEl.addEventListener('input', (e) => {
                // Defines debounce for search
                clearTimeout(this.searchDebounce);
                this.searchDebounce = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });

            this.searchInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        this.prevMatch();
                    } else {
                        this.nextMatch();
                    }
                    e.preventDefault();
                }
            });
        }

        if (this.searchPrevBtn) {
            this.searchPrevBtn.addEventListener('click', () => this.prevMatch());
        }

        if (this.searchNextBtn) {
            this.searchNextBtn.addEventListener('click', () => this.nextMatch());
        }
    }

    performSearch(query) {
        if (!query || query.trim() === '') {
            this.clearSearch();
            return;
        }

        // 1. Reset previous search
        this.clearHighlights();

        // 2. Find all matches (Text traversal)
        const walker = document.createTreeWalker(
            this.treeViewEl,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodesToHighlight = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.toLowerCase().includes(query.toLowerCase())) {
                // Must be inside a tree-row or one of its children (key/value)
                // Filter out irrelevant whitespace only nodes if needed, though includes check helps
                nodesToHighlight.push(node);
            }
        }

        // 3. Highlight matches
        this.searchResults = [];
        nodesToHighlight.forEach(textNode => {
            const span = document.createElement('span');
            const lowerText = textNode.nodeValue.toLowerCase();
            const lowerQuery = query.toLowerCase();

            // Simple string replacement for highlighting (split by query)
            // Note: This replaces the text node with a span containing mixed content
            const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
            const fragment = document.createDocumentFragment();

            let match;
            let lastIndex = 0;
            const text = textNode.nodeValue;

            // Using simple split because regex match loop on nodeValue is safer
            // But to keep it simple and robust for DOM:
            const parts = text.split(regex);

            // We only want to highlight if we actually found it.
            // The split will include the separator (wrapped in parens in regex) in the array.

            if (parts.length > 1) {
                const wrapper = document.createElement('span');

                parts.forEach(part => {
                    if (part.toLowerCase() === lowerQuery) {
                        const mark = document.createElement('mark');
                        mark.className = 'search-match';
                        mark.textContent = part;
                        wrapper.appendChild(mark);
                        this.searchResults.push(mark);
                    } else {
                        wrapper.appendChild(document.createTextNode(part));
                    }
                });

                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        });

        // 4. Update UI
        this.currentSearchIndex = -1;
        this.updateSearchCount();

        if (this.searchResults.length > 0) {
            this.nextMatch();
        }
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    clearSearch() {
        this.clearHighlights();
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.updateSearchCount();
    }

    clearHighlights() {
        // Remove 'search-match' classes or revert DOM changes
        // Since we replaced TextNodes with Spans, strictly easiest is to Re-render Tree
        // But that loses state (which details are open). 
        // Better: Find all .search-match, replace parent span with original text?
        // Actually, Re-rendering is acceptable for this tool if search is cleared.
        // It's robust.
        if (this.inputEl.value) {
            // We only re-render if we suspect modified DOM.
            // Optimisation: check if any .search-match exists
            if (this.treeViewEl.querySelector('.search-match')) {
                this.updateTree(); // This resets the view
            }
        }
    }

    nextMatch() {
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        this.scrollToMatch();
    }

    prevMatch() {
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this.scrollToMatch();
    }

    scrollToMatch() {
        const match = this.searchResults[this.currentSearchIndex];

        // Remove current class from all
        this.searchResults.forEach(el => el.classList.remove('current'));
        // Add to current
        match.classList.add('current');

        // Reveal (Expand parents)
        let parent = match.parentElement;
        while (parent && parent !== this.treeViewEl) {
            if (parent.tagName === 'DETAILS') {
                parent.open = true;
            }
            parent = parent.parentElement;
        }

        // Scroll
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });

        this.updateSearchCount();
    }

    updateSearchCount() {
        if (this.searchResults.length === 0) {
            if (this.searchCountEl) this.searchCountEl.textContent = '';
        } else {
            if (this.searchCountEl) this.searchCountEl.textContent = `${this.currentSearchIndex + 1}/${this.searchResults.length}`;
        }
    }
}
