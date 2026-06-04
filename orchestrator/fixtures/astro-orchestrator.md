# Orchestrator Rules

## rule: implement-*
- agent: implementer
- priority: 10
- config:
    maxRetries: 2

## rule: review-*
- agent: reviewer
- priority: 20

## rule: design-*
- agent: architect
- priority: 5
