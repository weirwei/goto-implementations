# Goto Implementations For Go

A Visual Studio Code extension that helps you quickly navigate to interface method implementations in Go code.

## Features

- **Go to Implementations**: Automatically detects interface methods in Go code and displays "Go to implementations" CodeLens above interface methods
- **Go to Interface**: Automatically detects struct methods in Go code and displays "goto iface" CodeLens above struct methods
- Supports jumping to method implementations from interfaces
- Supports jumping to interface methods from struct implementations
- Provides a selection list when multiple implementations/interfaces exist

## Examples

### Go to Implementations

When you have an interface definition in your Go code like:
```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
```

The extension will display a "goto impl" link above the `Read` method. When clicking the link:
- If there's only one implementation, it will jump directly to it
- If there are multiple implementations, a selection list will appear for you to choose

### Go to Interface

When you have a struct method implementation like:
```go
type FileReader struct {
    // ... fields
}

func (fr *FileReader) Read(p []byte) (n int, err error) {
    // ... implementation
}
```

The extension will display a "goto iface" link above the `Read` method. When clicking the link:
- If there's only one interface method, it will jump directly to it
- If there are multiple interface methods, a selection list will appear for you to choose

## Requirements

- VSCode 1.93.0 or higher
- Go language support

## Usage

1. After installing the extension, open any file containing Go interface definitions or struct methods
2. You'll see "goto impl" links appear above interface methods
3. You'll see "goto iface" links appear above struct methods
4. Click the links to jump to implementations or interfaces respectively

## How It Works

The extension automatically scans Go code for:
- **Interface definitions** and adds "goto impl" links above methods using VSCode's CodeLens feature
- **Struct method definitions** and adds "goto iface" links above methods

When a user clicks a link, the extension:

### For "goto impl":
1. Uses VSCode's implementation provider to search for all implementations
2. Jumps directly if a single implementation is found
3. Shows a selection list if multiple implementations are found
4. Displays a notification if no implementations are found


