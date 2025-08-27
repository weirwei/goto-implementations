import * as vscode from 'vscode';

interface MethodInfo {
    line: number;
    methodName: string;
    bracketCount: number;
    parenCount: number;
}

interface InterfaceContext {
    name: string;
    startLine: number;
    endLine: number;
    bracketCount: number;
}

class InterfaceCodeLensProvider implements vscode.CodeLensProvider {
    // Regular expressions
    private readonly interfaceStartRegex = /^type\s+(\w+)\s+interface\s*{/;
    private readonly methodStartRegex = /^\s*(\w+)\s*\(/;
    private readonly singleLineMethodRegex = /^\s*(\w+)\s*\([^)]*\)\s*(\([^)]*\)?|[^\n]*)?$/;
    private readonly returnTypePatterns = [
        /\)\s*\([^)]*\)/,  // ) (type)
        /\)\s*\w+/,        // ) type
    ];

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const interfaces = this.findInterfaces(document);
        
        console.log(`Found ${interfaces.length} interfaces in document`);
        
        for (const interfaceInfo of interfaces) {
            const interfaceCodeLenses = this.processInterface(document, interfaceInfo);
            codeLenses.push(...interfaceCodeLenses);
        }
        
        return codeLenses;
    }

    /**
     * Find all interfaces in the document
     */
    private findInterfaces(document: vscode.TextDocument): InterfaceContext[] {
        const interfaces: InterfaceContext[] = [];
        let currentInterface: InterfaceContext | null = null;
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const trimmedText = line.text.trim();
            
            // Check for interface start
            const interfaceMatch = trimmedText.match(this.interfaceStartRegex);
            if (interfaceMatch) {
                currentInterface = {
                    name: interfaceMatch[1],
                    startLine: i,
                    endLine: -1,
                    bracketCount: 1
                };
                console.log(`Found interface: ${currentInterface.name} at line ${i + 1}`);
                continue;
            }
            
            // Update bracket count for current interface
            if (currentInterface) {
                const lineText = line.text;
                currentInterface.bracketCount += (lineText.match(/{/g) || []).length;
                currentInterface.bracketCount -= (lineText.match(/}/g) || []).length;
                
                // Check if interface ends
                if (currentInterface.bracketCount === 0) {
                    currentInterface.endLine = i;
                    interfaces.push(currentInterface);
                    console.log(`Interface ${currentInterface.name} ends at line ${i + 1}`);
                    currentInterface = null;
                }
            }
        }
        
        return interfaces;
    }

    /**
     * Process a single interface and return its CodeLenses
     */
    private processInterface(document: vscode.TextDocument, interfaceInfo: InterfaceContext): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const methods = this.findMethodsInInterface(document, interfaceInfo);
        
        console.log(`Processing interface ${interfaceInfo.name} with ${methods.length} methods`);
        
        for (const method of methods) {
            const codeLens = this.createCodeLens(document, method, interfaceInfo.name);
            codeLenses.push(codeLens);
        }
        
        return codeLenses;
    }

    /**
     * Find all methods in a specific interface
     */
    private findMethodsInInterface(document: vscode.TextDocument, interfaceInfo: InterfaceContext): MethodInfo[] {
        const methods: MethodInfo[] = [];
        let currentMethod: MethodInfo | null = null;
        
        for (let i = interfaceInfo.startLine; i <= interfaceInfo.endLine; i++) {
            const line = document.lineAt(i);
            const lineText = line.text;
            const trimmedText = lineText.trim();
            
            // Skip comment lines
            if (trimmedText.startsWith('//')) {
                continue;
            }
            
            // Check for method start
            const methodStartMatch = trimmedText.match(this.methodStartRegex);
            if (methodStartMatch) {
                // Complete previous method if exists
                if (currentMethod) {
                    this.completeMethod(currentMethod, i - 1);
                    methods.push(currentMethod);
                }
                
                // Start new method
                currentMethod = {
                    line: i,
                    methodName: methodStartMatch[1],
                    bracketCount: 0,
                    parenCount: 1
                };
                continue;
            }
            
            // Process current method
            if (currentMethod) {
                this.updateMethodState(currentMethod, lineText);
                
                // Check if method is complete
                if (currentMethod.parenCount === 0 && this.isMethodComplete(document, i, interfaceInfo)) {
                    this.completeMethod(currentMethod, i);
                    methods.push(currentMethod);
                    currentMethod = null;
                }
            }
            
            // Also check for single-line methods
            if (this.singleLineMethodRegex.test(trimmedText)) {
                const methodMatch = trimmedText.match(this.methodStartRegex);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    const existingMethod = methods.find(m => m.methodName === methodName && m.line === i);
                    if (!existingMethod) {
                        methods.push({
                            line: i,
                            methodName,
                            bracketCount: 0,
                            parenCount: 0
                        });
                    }
                }
            }
        }
        
        // Handle remaining method
        if (currentMethod) {
            this.completeMethod(currentMethod, interfaceInfo.endLine);
            methods.push(currentMethod);
        }
        
        return methods;
    }

    /**
     * Update method state based on current line
     */
    private updateMethodState(method: MethodInfo, lineText: string): void {
        method.parenCount += (lineText.match(/\(/g) || []).length;
        method.parenCount -= (lineText.match(/\)/g) || []).length;
        console.log(`Method ${method.methodName}: parenCount = ${method.parenCount}`);
    }

    /**
     * Check if a method is complete
     */
    private isMethodComplete(document: vscode.TextDocument, currentLine: number, interfaceInfo: InterfaceContext): boolean {
        const line = document.lineAt(currentLine);
        const lineText = line.text;
        
        // Check current line for return type patterns
        if (lineText.includes(')')) {
            for (const pattern of this.returnTypePatterns) {
                if (pattern.test(lineText)) {
                    console.log(`Method completed at line ${currentLine + 1} (pattern match)`);
                    return true;
                }
            }
        }
        
        // Check next few lines for return type patterns
        for (let j = currentLine + 1; j <= Math.min(currentLine + 3, interfaceInfo.endLine); j++) {
            const nextLine = document.lineAt(j).text.trim();
            
            if (nextLine.startsWith('//')) {
                continue;
            }
            
            // Check for return type indicators
            if (nextLine.match(/^\s*\([^)]*\)/) || // (type)
                nextLine.match(/^\s*\w+/) || // type
                nextLine.includes(';') || // semicolon
                nextLine.includes('}')) { // closing brace
                console.log(`Method completed at line ${j + 1} (inferred)`);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Complete a method by setting its end line
     */
    private completeMethod(method: MethodInfo, endLine: number): void {
        method.bracketCount = endLine - method.line;
        console.log(`Completed method: ${method.methodName} (lines ${method.line + 1}-${endLine + 1})`);
    }

    /**
     * Create a CodeLens for a method
     */
    private createCodeLens(document: vscode.TextDocument, method: MethodInfo, interfaceName: string): vscode.CodeLens {
        const startLine = document.lineAt(method.line);
        const methodStart = startLine.text.indexOf(method.methodName);
        const methodPosition = new vscode.Position(method.line, methodStart);
        const methodRange = new vscode.Range(
            methodPosition,
            new vscode.Position(method.line, methodStart + method.methodName.length)
        );

        return new vscode.CodeLens(methodRange, {
            title: "goto impl",
            command: "goto-implementations.gotoImplementation",
            arguments: [document.uri, methodRange, method.methodName, interfaceName]
        });
    }

}

/**
 * Find the start of a method definition by looking backwards for 'func' keyword
 */
function findMethodStart(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    const line = position.line;
    const lineText = document.lineAt(line).text;
    
    // Look for 'func' keyword in the current line
    const funcIndex = lineText.indexOf('func');
    if (funcIndex !== -1) {
        return new vscode.Position(line, funcIndex);
    }
    
    // If not found in current line, look backwards
    for (let i = line - 1; i >= Math.max(0, line - 5); i--) {
        const prevLineText = document.lineAt(i).text;
        const funcIndex = prevLineText.indexOf('func');
        if (funcIndex !== -1) {
            return new vscode.Position(i, funcIndex);
        }
    }
    
    // Fallback to current position
    return position;
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
        async (uri: vscode.Uri, range: vscode.Range, methodName: string, interfaceName: string) => {
            try {
                console.log('Command triggered:');
                console.log('- URI:', uri.toString());
                console.log('- Method name:', methodName);
                console.log('- Interface name:', interfaceName);
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
                            
                            // Get the full method definition by expanding the range to include the function declaration
                            const methodStart = findMethodStart(doc, loc.range.start);
                            const methodRange = new vscode.Range(methodStart, loc.range.end);
                            const fullMethodText = doc.getText(methodRange);
                            
                            // Extract the receiver type (implementation class name)
                            // Match patterns like: func (d *debugWorkflowHandler) or func (h handler) or func (this *MyStruct) or func (*handler) or func (handler)
                            const receiverMatch = fullMethodText.match(/^func\s*\(\s*(\w+)?\s*\*?(\w+)\s*\)/);
                            const implementationClass = receiverMatch ? receiverMatch[2] : 'Unknown';
                            
                            // Debug logging
                            console.log(`Method text: ${text}`);
                            console.log(`Full method text: ${fullMethodText}`);
                            console.log(`Receiver match:`, receiverMatch);
                            console.log(`Implementation class: ${implementationClass}`);
                            
                            // Relative Path
                            const relativePath = vscode.workspace.asRelativePath(loc.uri);
                            return {
                                label: relativePath,     
                                detail: `${implementationClass}.${methodName}`,         
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

