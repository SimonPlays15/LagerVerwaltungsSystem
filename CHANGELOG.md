# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.1.0] - 2025-09-29

Semantic Versioning: Minor release inferred (new features added; no explicit breaking changes detected). If uncertain,
default would be patch.

### Added

- Camera Scanner functionality and optimized input handling within Dashboard and Layout
  components. ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))
- Form validation for stock movements (CheckIn/CheckOut) using zod and react-hook-form in
  Dashboard. ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))
- Method to ensure creation of a default cost center during
  initialization. ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))
- Initial project upload. ([06063bb](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/06063bb))

### Changed

- Refactored SQL queries in storage.ts to use Drizzle ORM helpers (gte,
  lte). ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))
- Improved handling of filters in reporting routes by defaulting empty strings instead of undefined
  values. ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))
- Refactored camera scanner script for video feed control and better error
  handling. ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))

### Removed

- Redundant and unused UI elements for a cleaner
  layout. ([afd37a6](https://github.com/SimonPlays15/LagerVerwaltungsSystem/commit/afd37a6))

[0.1.0]: https://github.com/SimonPlays15/LagerVerwaltungsSystem