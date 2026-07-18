---
name: Seed data with apostrophes causes silent INSERT failure
description: Multi-row INSERT with apostrophes in SQL string literals partially or fully fails
---
Apostrophes inside single-quoted SQL string values close the string literal early. Multi-row INSERTs with athlete names, notes, or excerpts containing apostrophes will silently fail or produce a parse error.
**Fix:** Use parameterised single-row `executeSql({ sqlQuery: "...", params: [value] })` inserts for any text content that may contain apostrophes. Never use template literals with text-content values.
