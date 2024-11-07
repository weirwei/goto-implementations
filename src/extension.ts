import * as vscode from 'vscode';

class InterfaceCodeLensProvider implements vscode.CodeLensProvider {
    // Regular expression for detecting interface methods
    private interfaceMethodRegex = /^\s*(\w+)\([^)]*\)(?:\s+\([^)]*\))?\s*(?:\w+\s*{)?$/;

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        let inInterface = false;
        let interfaceName = '';

        console.log('Start scanning document for interfaces...');

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text.trim();

            // Check if entering or leaving interface definition
            if (lineText.includes("interface") && lineText.includes("{")) {
                inInterface = true;
                // Extract interface name
                const matches = lineText.match(/type\s+(\w+)\s+interface/);
                if (matches) {
                    interfaceName = matches[1];
                }
                console.log(`Found interface at line ${i + 1}: ${interfaceName}`);
                continue;
            }

            if (lineText === "}") {
                inInterface = false;
                interfaceName = '';
                continue;
            }

            // If inside interface, check method definition
            if (inInterface && this.interfaceMethodRegex.test(lineText)) {
                const methodMatch = lineText.match(/^\s*(\w+)\(/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    console.log(`Found method in interface ${interfaceName}: ${methodName}`);
                    
                    // Get exact position of method name
                    const methodStart = line.text.indexOf(methodName);
                    const methodPosition = new vscode.Position(i, methodStart);
                    const methodRange = new vscode.Range(
                        methodPosition,
                        new vscode.Position(i, methodStart + methodName.length)
                    );

                    const codeLens = new vscode.CodeLens(methodRange, {
                        title: "➜ Go to implementations",
                        command: "goto-implementations.gotoImplementation",
                        arguments: [document.uri, methodRange, methodName]
                    });
                    codeLenses.push(codeLens);
                }
            }
        }

        return codeLenses;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "goto-implementations" is now active!');

    // Register CodeLens provider
    const codeLensProvider = new InterfaceCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'go', scheme: 'file' },
            codeLensProvider
        )
    );

    // Register jump command
    const disposable = vscode.commands.registerCommand(
        'goto-implementations.gotoImplementation', 
        async (uri: vscode.Uri, range: vscode.Range, methodName: string) => {
            try {
                console.log('Command triggered:');
                console.log('- URI:', uri.toString());
                console.log('- Method name:', methodName);
                console.log('- Position:', `line ${range.start.line + 1}, column ${range.start.character}`);

                // Use VSCode's built-in implementation search
                const implementations = await vscode.commands.executeCommand<vscode.Location[]>(
                    'vscode.executeImplementationProvider',
                    uri,
                    range.start
                );

                console.log('Number of implementations found:', implementations?.length || 0);

                if (implementations && implementations.length > 0) {
                    // If only one implementation is found, jump directly
                    if (implementations.length === 1) {
                        const location = implementations[0];
                        console.log('Jumping to single implementation:', location.uri.toString());
                        await vscode.window.showTextDocument(location.uri, {
                            selection: location.range
                        });
                    } else {
                        // If multiple implementations found, show selection list
                        const items = await Promise.all(implementations.map(async loc => {
                            const doc = await vscode.workspace.openTextDocument(loc.uri);
                            const text = doc.getText(loc.range);
                            const preview = text.trim().split('\n')[0];
                            console.log('Found implementation:', preview);
                            return {
                                label: preview,
                                description: loc.uri.fsPath,
                                location: loc
                            };
                        }));

                        const selected = await vscode.window.showQuickPick(items, {
                            placeHolder: `Select implementation of ${methodName}`
                        });

                        if (selected) {
                            console.log('User selected implementation:', selected.label);
                            await vscode.window.showTextDocument(selected.location.uri, {
                                selection: selected.location.range
                            });
                        }
                    }
                } else {
                    console.log('No implementations found');
                    vscode.window.showInformationMessage(`No implementations found for ${methodName}`);
                }
            } catch (error) {
                console.error('Error occurred while finding implementations:', error);
                vscode.window.showErrorMessage('Error while finding implementations: ' + error);
            }
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
