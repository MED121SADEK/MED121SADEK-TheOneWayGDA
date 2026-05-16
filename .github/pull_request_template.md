# PR Template for The One-Way

## Description
<!-- Brief description of what this PR does -->

## Type of Change
- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking fix)
- [ ] Refactor (code improvement, no feature change)
- [ ] Performance improvement
- [ ] Documentation update
- [ ] DevOps/CI/CD change
- [ ] Security fix

## Related Issues
<!-- Link to related issues: Fixes #123, Related to #456 -->

## Changes Made
<!-- List the key changes -->
-
-
-

## Testing
- [ ] Tested locally with `bun run dev`
- [ ] Build passes with `bun run build`
- [ ] Existing tests still pass
- [ ] New tests added (if applicable)

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Database Changes
- [ ] No database changes
- [ ] Schema migration required: `bunx prisma migrate dev --name description`

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No hardcoded secrets or credentials
- [ ] Error handling is proper
- [ ] API routes use structured logger (`apiRouteLogger`)
- [ ] Console.log statements removed or replaced with logger

## Risk Assessment
- **Risk Level**: [Low / Medium / High]
- **Potential Impact**: [What could go wrong]
- **Rollback Plan**: [How to revert if things break]
