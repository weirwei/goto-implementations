# Goto Implementations For Go

A Visual Studio Code extension that helps you quickly navigate to interface method implementations in Go code.

## Features

- Automatically detects interface methods in Go code
- Displays "Go to implementations" CodeLens above interface methods
- Supports jumping to method implementations
- Provides a selection list when multiple implementations exist

Example:

When you have an interface definition in your Go code like:
```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
```

The extension will display a "goto impl" link above the `Read` method. When clicking the link:
- If there's only one implementation, it will jump directly to it
- If there are multiple implementations, a selection list will appear for you to choose

## Requirements


## Usage

1. After installing the extension, open any file containing Go interface definitions
2. You'll see "goto impl" links appear above interface methods
3. Click the link to jump to the implementation

## How It Works

The extension automatically scans Go code for interface definitions and adds links above methods using VSCode's CodeLens feature. When a user clicks the link, the extension:

1. Uses VSCode's implementation provider to search for all implementations
2. Jumps directly if a single implementation is found
3. Shows a selection list if multiple implementations are found
4. Displays a notification if no implementations are found

