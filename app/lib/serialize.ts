// Convert a Mongoose lean doc (or any object containing ObjectIds, Dates, or
// other non-plain values) into a JSON-safe plain object suitable for passing
// from a Server Component to a Client Component. Use this at the boundary
// whenever data sourced from the database is handed to a client component.
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
