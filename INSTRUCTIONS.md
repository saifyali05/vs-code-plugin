Setup and run instructions for ChatGPT → VS Code real-time transfer

Overview
- The VS Code extension runs a local WebSocket server (default ws://localhost:8765) and listens for incoming code messages.
- The Chrome extension connects to that WebSocket and adds a "Send to VS Code" button to code blocks on ChatGPT; clicking it sends the selected or full code block.

VS Code extension (server)
1. Install dependencies:

```powershell
cd "c:\Users\SAIF_ALI\OneDrive\文档\Desktop\plug_in\vibe"
npm install
```

2. Run the extension in the Extension Development Host (recommended):
- Open this folder in VS Code and press F5. The extension will activate and start a WebSocket server on port 8765.

3. Alternatively, package and install the extension. Ensure `ws` is included in dependencies in `package.json`.

Chrome extension (client)
1. Open Chrome (or Edge) and go to `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `chrome-extension` folder inside this project.
4. Open ChatGPT at https://chat.openai.com/ and open or produce a message with a code block. A small "Send to VS Code" button should appear on each code block.

Testing
1. Ensure the VS Code Extension Development Host is running (F5) so the WebSocket server is active.
2. In ChatGPT, click "Send to VS Code" on a code block. The code should appear at the cursor position in the active editor in VS Code.
3. Success messages appear in VS Code and small inline feedback appears near the button in the browser.

WebSocket usage (how it works)
- The VS Code extension starts a WebSocket server (using the `ws` library) bound to localhost:8765.
- The Chrome content script creates a WebSocket client connecting to `ws://localhost:8765`.
- When the user clicks the button, the content script sends the selected code (or entire block) as a plain text message over the WebSocket.
- The VS Code server receives the message, and the extension inserts the received text into the active editor at the cursor position.
- Simple reconnection logic is present in the Chrome client; the server logs errors and shows friendly messages in VS Code when insertions fail.

Security note
- This setup uses an unauthenticated local WebSocket and is intended for local development only. Do not expose the server to untrusted networks without authentication.

Next steps / enhancements
- Add a small handshake (JSON message) to indicate language metadata and allow insertion with formatting.
- Add user configuration for port, insert mode (replace selection vs insert), and auto-activate behavior.
