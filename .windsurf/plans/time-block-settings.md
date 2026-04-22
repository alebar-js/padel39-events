# Add Time Block Settings to Courts Modal

This plan adds the ability to configure time block length (slot minutes) to the existing "Edit Courts" modal, allowing tournament administrators to adjust the duration of each scheduling slot.

## Current State Analysis

- Time blocks are stored in `TournamentDay` model with `slotMinutes` field (default: 90 minutes)
- The schedule grid uses `slotsForDay()` function to generate time slots based on `slotMinutes`
- Current court modal only manages court names and count
- No existing server actions for updating tournament day settings

## Required Changes

### 1. Create Server Action for Time Block Updates
- Create `updateTournamentDaySettings` function in `schedule.ts` actions
- Handle validation (minimum 15 minutes, maximum 240 minutes)
- Update all tournament days with new slot minutes
- Handle conflicts with existing scheduled matches

### 2. Extend Modal Interface
- Add time block settings section to existing court modal
- Include current slot minutes display
- Add input field for new slot minutes with validation
- Show warning about impact on existing scheduled matches

### 3. Update Modal Component
- Pass tournament days data to modal
- Add state for slot minutes editing
- Add form validation and error handling
- Include confirmation dialog for slot changes that affect scheduled matches

### 4. Update Page Component
- Pass tournament days data to modal
- Refresh page data after slot minutes updates

## Implementation Details

### Server Action (`schedule.ts`)
```typescript
export async function updateTournamentDaySettings(
  tournamentId: string, 
  slotMinutes: number, 
  tournamentSlug: string
): Promise<{ error?: string; affectedMatches?: number }>
```

### Modal Enhancements
- Add section above courts list for "Time Settings"
- Display current slot minutes
- Input field with min/max validation
- Warning message about scheduled matches
- Apply button with confirmation

### Data Flow
1. User opens "Edit Courts" modal
2. Sees current time block length
3. Changes value and clicks "Apply"
4. Server validates and updates all tournament days
5. Page refreshes to show new time slots
6. Schedule grid recalculates with new slot duration

## Edge Cases & Considerations

- **Scheduled Matches**: If matches exist, show warning and require confirmation
- **Validation**: Min 15 minutes, max 240 minutes (4 hours)
- **Performance**: Update all tournament days in single operation
- **UI**: Clear indication of current vs. new values
- **Error Handling**: Server validation with user-friendly messages

## Files to Modify

1. `app/lib/actions/schedule.ts` - Add update function
2. `app/admin/t/[slug]/schedule/court-modal.tsx` - Add UI section
3. `app/admin/t/[slug]/schedule/schedule-client.tsx` - Pass days data
4. `app/admin/t/[slug]/schedule/page.tsx` - Update prop types

## Testing Considerations

- Verify slot minutes validation
- Test with existing scheduled matches
- Confirm schedule grid updates correctly
- Check page refresh after changes
- Validate error states and messages
