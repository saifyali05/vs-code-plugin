// Content script: detect code blocks on ChatGPT and add a "Send to VS Code" button.
/* @ts-nocheck */
/* global document, window, Node, MutationObserver, getComputedStyle, WebSocket */
(function () {
    try {
        console.debug('content.js booting');

    // Note: page must not open ws:// from an https page. Background service worker handles WS.
    function connect() {
        // noop: connection handled by background service worker
        return;
    }

    function createButton() {
        const btn = document.createElement('button');   // ✅ fixed
        btn.className = 'send-to-vscode-btn';
        btn.textContent = 'Send to VS Code';

        btn.style.position = 'absolute';
        btn.style.zIndex = 2147483647;
        btn.style.padding = '4px 8px';
        btn.style.fontSize = '12px';
        btn.style.borderRadius = '4px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.background = '#0b5fff';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';

        return btn;
    }

    function findCodeBlocks(root = document) {
        const selectors = [
            'pre code',
            'div[class*="code"] code',
            'div.markdown code',
            'code',
            'pre'
        ];

        const results = new Set();

        function addFrom(node) {
            try {
                selectors.forEach(sel => {
                    node.querySelectorAll?.(sel).forEach(el => results.add(el));
                });
            } catch (e) {}

            if (node.shadowRoot) addFrom(node.shadowRoot);

            node.childNodes?.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE) addFrom(child);
            });
        }

        addFrom(root);
        return Array.from(results);
    }

    function attachButtonToCode(codeEl) {
        if (!codeEl || codeEl._hasSendButton) return;
        codeEl._hasSendButton = true;

        const pre = codeEl.closest?.('pre');
        const container = pre || codeEl.parentElement || codeEl;
        if (!container) return;

        try {
            if (getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
        } catch (e) {}

        const btn = createButton();
        btn.style.top = '8px';
        btn.style.right = '8px';
        container.appendChild(btn);

        const feedback = document.createElement('span');
        feedback.style.marginLeft = '8px';
        feedback.style.color = '#0b5fff';
        feedback.style.fontSize = '12px';
        feedback.style.display = 'none';
        container.appendChild(feedback);

        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            connect();

            const sel = window.getSelection();
            let textToSend = '';

            try {
                if (sel && sel.rangeCount > 0 && container.contains(sel.anchorNode)) {
                    textToSend = sel.toString();
                }
            } catch (e) {}

            if (!textToSend) {
                textToSend = (codeEl.innerText || codeEl.textContent || '').trim();
            }

            if (!textToSend) {
                showTemporary(feedback, 'No code');
                return;
            }

            // Instead of opening a websocket from the page (blocked on HTTPS), send message to background
            try {
                chrome.runtime.sendMessage({ type: 'sendCode', code: textToSend }, (resp) => {
                    try {
                        if (resp && resp.status === 'sent') showTemporary(feedback, 'Sent');
                        else if (resp && resp.status === 'queued') showTemporary(feedback, 'Queued');
                        else showTemporary(feedback, 'Error');
                    } catch (e) { console.error(e); }
                });
            } catch (e) {
                console.error('send to background failed', e);
                showTemporary(feedback, 'Error');
            }
        });
    }

    function showTemporary(el, text) {
        el.textContent = text;
        el.style.display = 'inline';
        setTimeout(() => el.style.display = 'none', 2000);
    }

    function scanAndAttach(root) {
        const codes = findCodeBlocks(root);
        codes.forEach(attachButtonToCode);
    }

    function addDebugOverlay() {
        if (document.getElementById('vscode-scan-debug')) return;

        const dbg = document.createElement('div');
        dbg.id = 'vscode-scan-debug';
        dbg.style.position = 'fixed';
        dbg.style.bottom = '12px';
        dbg.style.left = '12px';
        dbg.style.zIndex = 2147483647;
        dbg.style.background = 'rgba(0,0,0,0.6)';
        dbg.style.color = '#fff';
        dbg.style.padding = '6px 8px';
        dbg.style.borderRadius = '6px';
        dbg.style.fontSize = '12px';
        dbg.style.cursor = 'pointer';
        dbg.textContent = 'Rescan code blocks';

        dbg.onclick = () => scanAndAttach(document);
        document.body.appendChild(dbg);
    }

        function init() {
            try {
                connect();
                scanAndAttach(document);
                addDebugOverlay();

                const mo = new MutationObserver(mutations => {
                    for (const m of mutations) {
                        m.addedNodes?.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                scanAndAttach(node);
                            }
                        });
                    }
                });

                if (document.body) {
                    mo.observe(document.body, { childList: true, subtree: true });
                } else {
                    console.debug('content.js: document.body not ready, waiting for DOMContentLoaded');
                    window.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: true }));
                }
            } catch (e) {
                console.error('content init error', e);
            }
        }

        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } catch (outerErr) {
        console.error('content.js fatal error', outerErr);
    }
})();

