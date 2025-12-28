// Background service worker: maintains a WebSocket client and forwards messages from content scripts.
console.log('ChatGPT to VS Code Sender background worker loaded');

// WebSocket client managed in the background so content scripts don't open ws:// from HTTPS pages
const WS_URL = 'ws://localhost:8788';
let ws = null;
let wsQueue = [];
let wsConnecting = false;

function connectWs() {
	if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
	try {
		wsConnecting = true;
		ws = new WebSocket(WS_URL);
		ws.addEventListener('open', () => {
			wsConnecting = false;
			console.log('background: connected to local WS server');
			// flush queue
			while (wsQueue.length && ws && ws.readyState === WebSocket.OPEN) {
				ws.send(wsQueue.shift());
			}
		});
		ws.addEventListener('message', (ev) => {
			console.log('background: received', ev.data);
		});
		ws.addEventListener('close', () => {
			console.log('background: WS closed, retry in 2s');
			ws = null;
			setTimeout(connectWs, 2000);
		});
		ws.addEventListener('error', (e) => {
			console.error('background: WS error', e);
			ws = null;
			wsConnecting = false;
			setTimeout(connectWs, 2000);
		});
	} catch (e) {
		console.error('background: failed to create WS', e);
		ws = null;
		wsConnecting = false;
	}
}

connectWs();

// Receive messages from content scripts and forward to local WebSocket server
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message && message.type === 'sendCode') {
		const payload = message.code || '';
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(payload);
			sendResponse({ status: 'sent' });
		} else {
			// queue and attempt to connect
			wsQueue.push(payload);
			connectWs();
			sendResponse({ status: 'queued' });
		}
		// indicate we'll respond asynchronously
		return true;
	}
});
