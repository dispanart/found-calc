# @found-calc/rules

Immutable rule-version and effective-date resolution for Found Calc.

This package selects exactly one pre-declared rule dependency for a validated ISO date-only effective date, or returns an explicit unavailable/ambiguous failure. It may depend on `@found-calc/engine` contract types; the engine never depends on this package.

The bundled Phase 02 synthetic rate fixtures are test/reference data only. They are not tax, legal, marketplace, health, payroll, fiqh, or other production guidance.
