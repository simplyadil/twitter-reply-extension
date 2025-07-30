class DOMUtils {
  static findElements(container, selectors) {
    let elements = [];
    selectors.forEach((selector) => {
      const found = container.querySelectorAll(selector);
      elements = elements.concat(Array.from(found));
    });
    return elements;
  }

  static findElement(container, selectors) {
    for (const selector of selectors) {
      const element = container.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  static matchesAnySelector(element, selectors) {
    if (!element.matches) return false;
    return selectors.some((selector) => element.matches(selector));
  }

  static createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) {
      element.className = options.className;
    }

    if (options.cssText) {
      element.style.cssText = options.cssText;
    }

    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    if (options.onclick && typeof options.onclick === 'function') {
      element.addEventListener('click', options.onclick);
    }

    return element;
  }

  static removeElements(selector, container = document) {
    const elements = container.querySelectorAll(selector);
    elements.forEach((element) => element.remove());
  }

  static addStyles(id, css) {
    if (document.querySelector(`#${id}`)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DOMUtils;
} else {
  window.DOMUtils = DOMUtils;
}
