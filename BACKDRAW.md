# Technical Specification: Single Elimination with Back Draw

## 1. Project Purpose
Implement a tournament generation engine that guarantees every participant plays at least two matches. The system must instantiate all match slots (Main Draw and Back Draw) at the time of creation to facilitate court reservations and scheduling.

## 2. Core Logic & Constraints
* **Format:** Single Elimination for both the Main and Consolation (Back) brackets.
* **The "Two-Match" Guarantee:** * Losers of Main Draw Round 1 (R1) drop to the Back Draw.
    * Teams with a "Bye" in R1 who lose their first actual match in R2 also drop to the Back Draw.
* **Pre-Scheduling:** All `Match` entities must be generated upfront with unique IDs.

## 3. Data Model Requirements

### Match Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `match_id` | String | Unique ID (e.g., `MAIN_R1_M1`, `BACK_R1_M1`). |
| `p_a` | String/ID | Participant A (Team ID or "TBD"). |
| `p_b` | String/ID | Participant B (Team ID or "TBD"). |
| `winner_to` | String | ID of the match the winner advances to. |
| `loser_to` | String | ID of the match the loser drops to (nullable). |
| `is_back_draw` | Boolean | Identifies if the match is in the consolation bracket. |

## 4. Implementation Algorithm

### Step 1: Bracket Sizing
1. Calculate the smallest power of 2 ($S$) that is $\ge$ the number of teams ($N$).
2. Total Main Draw Matches = $S - 1$.
3. Total Back Draw Matches = $(S / 2) - 1$.

### Step 2: Slot Generation & Linking
1. **Initialize Main Draw:** Create nodes for a binary tree of size $S$.
2. **Initialize Back Draw:** Create a secondary binary tree of size $S/2$.
3. **Map Losers:** - Assign `loser_to` for all Main Draw R1 matches to the corresponding R1 matches in the Back Draw.
   - For Main Draw R2: If a slot contains a team that had a Bye in R1, ensure their `loser_to` pointer is directed to the Back Draw.

## 5. Reference Logic (Python)

```python
import math

class TournamentEngine:
    def __init__(self, team_count):
        self.n = team_count
        self.s = 2 ** math.ceil(math.log2(team_count))
        self.matches = []

    def create_skeleton(self):
        # Generate Main Draw Matches
        for i in range(self.s - 1):
            self.matches.append({
                "id": f"M{i+1}",
                "winner_to": self.calculate_winner_path(i),
                "loser_to": self.calculate_loser_path(i),
                "type": "MAIN"
            })

        # Generate Back Draw Matches
        for i in range((self.s // 2) - 1):
            self.matches.append({
                "id": f"B{i+1}",
                "winner_to": self.calculate_back_winner_path(i),
                "type": "BACK"
            })
        return self.matches

    def calculate_winner_path(self, i):
        # Standard binary tree progression logic
        pass

    def calculate_loser_path(self, i):
        # Logic to catch R1 losers and R2 'First-Match' losers
        if i < (self.s // 2):
            return f"B{math.floor(i/2) + 1}"
        return None
```

### 6. Execution Instructions for AgentInput
1. Accept an integer $N$ (number of teams).
2. Output: A JSON array of all Match objects with pre-linked IDs.
3. Validation: Ensure that for any $N$, the total number of matches is exactly $(S - 1) + ((S/2) - 1)$.