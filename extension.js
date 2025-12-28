// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const WebSocket = require('ws');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
let wss;
const DEFAULT_PORT = 8788;

function activate(context) {

	console.log('Congratulations, your extension "vibe" is now active!');

	// Start a WebSocket server on localhost
	try {
		wss = new WebSocket.Server({ port: DEFAULT_PORT }, () => {
			console.log(`WebSocket server listening on ws://localhost:${DEFAULT_PORT}`);
		});

		wss.on('connection', (socket, req) => {
			console.log('Chrome extension connected');
socket.on('message', async (message) => {
    try {
        const code = message.toString();
        console.log('Received message:', code);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            console.log('Active editor found:', editor.document.fileName);
            const pos = editor.selection.active;
            console.log('Inserting at line', pos.line + 1, 'column', pos.character + 1);
            const success = await editor.edit(editBuilder => {
                editBuilder.insert(pos, code);
            });
            console.log('Edit result:', success);
            vscode.window.showInformationMessage('Code received from ChatGPT — inserted at cursor.');
        } else {
            console.warn('No active editor');
            vscode.window.showWarningMessage('Received code but no active editor to insert into.');
        }
    } catch (err) {
        console.error('Error inserting code:', err);
        vscode.window.showErrorMessage('Error inserting code: ' + err.message);
    }
});

			socket.on('error', (err) => {
				console.error('WebSocket connection error:', err);
			});
		});

		wss.on('error', (err) => {
			console.error('WebSocket server error:', err);
			vscode.window.showErrorMessage('WebSocket server error: ' + err.message);
		});
	} catch (err) {
		console.error('Failed to start WebSocket server:', err);
		vscode.window.showErrorMessage('Failed to start WebSocket server: ' + err.message);
	}

	// Keep the existing sample command for quick tests
	const disposable = vscode.commands.registerCommand('vibe.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from saif to istakbal copy paste automatically!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {
	if (wss) {
		try {
			wss.close();
			console.log('WebSocket server closed');
		} catch (err) {
			console.error('Error closing WebSocket server:', err);
		}
	}
}

module.exports = {
	activate,
	deactivate
}
