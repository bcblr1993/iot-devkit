/**
 * @fileoverview DOM Helper Utilities - DOM操作辅助函数
 */

/**
 * 通过ID获取元素
 * @param {string} id - 元素ID
 * @returns {HTMLElement|null}
 */
export function getElement(id) {
    return document.getElementById(id);
}

/**
 * 通过选择器获取所有元素
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} parent - 父元素
 * @returns {NodeListOf<Element>}
 */
export function getElements(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * 添加事件监听器
 * @param {HTMLElement} element - DOM元素
 * @param {string} event - 事件名称
 * @param {Function} handler - 事件处理函数
 */
export function on(element, event, handler) {
    if (element) {
        element.addEventListener(event, handler);
    }
}

/**
 * 移除事件监听器
 * @param {HTMLElement} element - DOM元素
 * @param {string} event - 事件名称
 * @param {Function} handler - 事件处理函数
 */
export function off(element, event, handler) {
    if (element) {
        element.removeEventListener(event, handler);
    }
}

/**
 * 显示/隐藏元素
 * @param {HTMLElement} element - DOM元素
 * @param {boolean} show - 是否显示
 */
export function toggleDisplay(element, show) {
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * 添加/移除CSS类
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - CSS类名
 * @param {boolean} add - 是否添加
 */
export function toggleClass(element, className, add) {
    if (element) {
        if (add) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
}

/**
 * 派发自定义事件
 * @param {string} eventName - 事件名称
 * @param {*} detail - 事件详情
 */
export function dispatchCustomEvent(eventName, detail = null) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
}
