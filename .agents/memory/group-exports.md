---
name: Group module export pattern
description: group.js exports named exports, handler.js destructures them
---

group.js must use `module.exports = { groupCommands, handleAntilinkViolation }` (named exports).

handler.js imports as:
- `const { groupCommands, handleAntilinkViolation: _halb } = require('./commands/group');`
- Separate import line: `const { handleAntilinkViolation } = require('./commands/group');`

**Why:** The original file used `module.exports = groupCommands` (direct export of the object). When we added `handleAntilinkViolation` as a named export alongside, we needed to change the export structure and all import sites.

**How to apply:** Any time you add a new exported function to group.js, add it to the `module.exports = { groupCommands, handleAntilinkViolation, newFn }` object.
