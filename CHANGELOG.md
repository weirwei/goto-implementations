# Change Log

All notable changes to the "goto-implementations" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.5.0] - 2025-08-27

### Added

- **New "goto iface" feature**: Added support for jumping from struct method implementations to their corresponding interface methods

## [0.4.0] - 2025-08-27

### Added

- Optimized the display information of goto implementation, now shows as `ImplementationClass.MethodName`

### Fixed

- Fixed the issue where multi-line Go functions could not display goto impl

## [0.3.0] - 2024-11-08

### Changed

- Add icon
- Change name from `goto-implementations` to `Goto Implementations`

## [0.2.0] - 2024-11-08

### Fixed

- Fix regex bugs

### Changed

- Multiple implementations jump label show relative path

## [0.1.0] - 2024-11-07

### Changed

- Change engine to vscode 1.93.0 (support cursor)

## [0.0.1] - 2024-11-07

### Added

- Initial release
- Support for Go interface method implementation navigation
- Support for direct jump to single implementation and selection list for multiple implementations

