<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mongoose → Client Component boundary

Any data sourced from MongoDB (Mongoose `.lean()` results, or any object built from one) must be passed through `serialize()` from `app/lib/serialize.ts` before being handed to a Client Component as a prop. Raw lean docs contain `ObjectId` and `Date` instances whose `toJSON` methods trip Next.js's "only plain objects" check.

- Use `serialize(doc)` — never inline `JSON.parse(JSON.stringify(...))`.
- When in doubt, serialize everything — even objects built from `.toString()` calls may contain Mongoose `DocumentArray` or subdocument instances if any field was copied from a lean result without explicit mapping.
- The boundary is the page-to-client-component prop, not the database query — keep `.lean()` results typed as their Mongoose interfaces internally; only serialize at the prop site.
