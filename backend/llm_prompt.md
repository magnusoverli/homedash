Extract daily time information from this school schedule image, organizing it into three datasets: school_schedule, school_activities, and school_homework.

## CORE DECISION RULE ⚠️ CRITICAL ⚠️

**TIMING IS EVERYTHING**: Use each day's "Start" and "Slutt" times to determine what goes where:
- Activities that start BEFORE "Slutt" time → Part of school_schedule (regular school day)
- Activities that start AT OR AFTER "Slutt" time → Extract as school_activities (after-school)
- Homework assignments → Extract from dedicated homework section only

**⚠️ MOST COMMON ERROR**: Misclassifying regular subjects that appear in the timetable grid as separate activities. If it's in the schedule grid, it's part of the school day!

## DATASET DEFINITIONS

**school_schedule**: The mandatory school day from "Start" to "Slutt" times
- Includes: Regular classes, breaks, in-school activities, special notes (PE, outdoor activities)
- Boundary: Everything between "Start" and "Slutt" times

**school_activities**: Optional activities outside regular school hours  
- Includes: Parent meetings, after-school programs, clubs that occur OUTSIDE the timetable grid
- Boundary: Activities starting AT OR AFTER the day's "Slutt" time AND not appearing in the regular schedule grid

**school_homework**: Assignments from the homework section
- Includes: Subject-specific assignments from "Lekser" or "Læringsmål og lekser" table
- Boundary: Only from dedicated homework section, not from schedule grid

## EXTRACTION RULES

### 1. School Schedule Dataset
**Time Extraction:**
- Start time: Find "Start" followed by HH:MM format
- End time: Find "Slutt" followed by HH:MM format for EACH SPECIFIC DAY
- ⚠️ CRITICAL: "Slutt" times are DAY-SPECIFIC - each day may have different end times
- If no "Slutt" time is shown for a day, look at the last regular class/activity in the timetable grid
- The "Slutt" time is when classes end on THAT SPECIFIC DAY, NOT when all activities end

**Notes Extraction:**
- Extract 1-3 word notes that appear during school hours (between Start and Slutt)
- Target special activities: "Gym", "Kroppsøving", "Uteskole", "PE", "Turdag", "Svømming", "Leksehjelp"
- **Normalize terms:**
  - PE/sports activities: Use "Gym" for any PE/sports activities
  - Homework help: Use "Leksehjelp" when detected in the schedule
  - Field trips: Use "Turdag" for any field trip/outdoor excursion (tur, høst-tur, vår-tur, vintertur, utflukt, ekskursjon, besøk til, etc.)
- **Always note "Leksehjelp"**: If "Leksehjelp" appears in a day's schedule, include it in that day's notes
- **Multiple notes format**: When multiple special activities occur on the same day, separate them with commas (e.g., "Gym, Leksehjelp")
- Use empty string "" if no special notes found

**Field Trip Pattern Recognition & Deduplication:**
- **CRITICAL**: Recognize ALL variations of field trips and normalize to "Turdag"
- **Common patterns**: "Turdag", "tur", "Høst-tur", "Vår-tur", "Vintertur", "utflukt", "ekskursjon", "field trip"
- **With descriptors**: "Høst-tur med...", "Tur til...", "Utflukt til...", "besøk til..."
- **In Husk section**: "Turdag(fredag)", "Turdag (onsdag)", etc. - extract day mentioned in parentheses
- **Deduplication rule**: If the same field trip is mentioned BOTH in the timetable grid for a specific day AND in the "Husk:" or notes section for the same day → Extract only ONCE as "Turdag" note
- **Validation**: Always check the day mentioned in "Husk:" section matches the day in the timetable grid before deduplicating
- **Example**: "Høst-tur med GodtPåFjellet" in Friday column + "Turdag(fredag)" in Husk section = ONE "Turdag" note for Friday (not two)

### 2. School Activities Dataset
**⚠️ CRITICAL INCLUSION CRITERIA:**
- Activity must NOT appear in the regular timetable grid
- Activity start time >= that specific day's "Slutt" time  
- **IMPORTANT**: If an activity appears in the schedule grid (like "Leksehjelp"), it's part of the school day, NOT a separate activity
- Examples: 
  - "Foreldremøte" mentioned in notes section → EXTRACT (if after school hours)
  - "Foresattmøte" mentioned in notes section → EXTRACT (if after school hours)
  - "Foreldresamtale" mentioned in notes section → EXTRACT (if after school hours)
  - "Leksehjelp" in timetable grid → DO NOT EXTRACT (it's a regular subject)
  - "Gym" in timetable grid → DO NOT EXTRACT (part of school day)
- Only extract activities that are listed OUTSIDE the regular schedule grid

**Type Classification:**
- "recurring": Weekly activities (e.g., after-school clubs, tutoring programs)
- "one_time": Single events with keywords "Husk", "møte", or any parent meeting variations (see Parent Meeting Recognition below)
- "exam": Tests, exams, assessments

**Parent Meeting Recognition:**
- **CRITICAL**: Intelligently detect ANY parent/guardian meeting regardless of exact terminology
- **Base patterns**: Look for activities containing "foreldre*" OR "foresatt*" (parents/guardians)
- **Meeting terms**: Combined with "møte", "samtale", "kveld", "treff", "besøk", "time" (meeting/conversation/evening/visit/appointment)
- **Examples to recognize**: "foreldremøte", "foresattmøte", "foreldresamtale", "foresattsamtale", "foreldrekveld", "foresattkveld", "foreldrebesøk", "foresatttime"
- **Case insensitive**: Detect variations in capitalization (Foreldremøte, FORESATTMØTE, etc.)
- **Always classify as**: type: "one_time" (parent meetings are typically single events)
- **Extract rule**: Only if they occur OUTSIDE the regular timetable grid and after school hours

**Exclusion Criteria:**
- "Lekekurs", "TL", "lærer", "lærerutdanning" (teacher training)
- Regular subjects (Matte, Norsk, Engelsk, Leksehjelp)
- **ANY activity that appears in the regular timetable grid** (regardless of timing)

### 3. School Homework Dataset
**Source Location:**
- Find homework table containing "Lekser" or "Læringsmål og lekser"
- Extract subject name and assignment description
- Skip "Mål" (goals) column - assignments only

## OUTPUT FORMAT

Dataset 1 - school_schedule:
```json
{
  "Monday": {"start": "HH:MM", "end": "HH:MM", "notes": "Gym, Leksehjelp"},
  "Tuesday": {"start": "HH:MM", "end": "HH:MM", "notes": ""},
  "Wednesday": {"start": "HH:MM", "end": "HH:MM", "notes": "Uteskole"},
  "Thursday": {"start": "HH:MM", "end": "HH:MM", "notes": ""},
  "Friday": {"start": "HH:MM", "end": "HH:MM", "notes": "Gym"}
}
```

Dataset 2 - school_activities:
```json
[
  {"day": "[day]", "name": "[activity name]", "start": "HH:MM", "end": "HH:MM", "type": "[recurring|one_time|exam]", "specific_date": null}
]
```

Dataset 3 - school_homework:
```json
[
  {"subject": "[subject name]", "assignment": "[homework description]"}
]
```

## EXAMPLES

**Example 1 - Notes Extraction:**
- Monday "Leksehjelp 14:15-15:15" in timetable grid → Monday notes: "Leksehjelp"
- Tuesday "Gym 10:00-11:00" in timetable grid → Tuesday notes: "Gym"  
- Wednesday "Uteskole 09:00-12:00" in timetable grid → Wednesday notes: "Uteskole"
- Thursday no special activities → Thursday notes: ""
- **Friday "Høst-tur med GodtPåFjellet" in grid + "Turdag(fredag)" in Husk section → Friday notes: "Turdag" (deduplicated, same event)**
- **Monday with multiple activities**: "Gym 10:00-11:00" and "Leksehjelp 14:15-15:15" → Monday notes: "Gym, Leksehjelp"
- Any special subject in the grid gets noted for that specific day

**Example 2 - School End Time Logic:**
- If schedule grid shows classes until 15:00, then school ends at 15:00 (regardless of individual "Slutt" entries)
- "Slutt 13:05" on Tuesday means early dismissal that specific day
- Use the latest time in the grid OR explicit "Slutt" time, whichever makes sense for that day

**Example 3 - Activity Classification (for activities NOT in timetable grid):**
- After-school tutoring program → type: "recurring"
- "Foreldremøte tirsdag" → type: "one_time"
- "Foresattmøte onsdag 19:00" → type: "one_time"
- "Foreldresamtale torsdag" → type: "one_time"
- "Foreldrekveld fredag" → type: "one_time"
- "Foresattsamtale mandag 18:30" → type: "one_time"
- "FORELDREMØTE torsdag" → type: "one_time"
- "Foresattbesøk onsdag" → type: "one_time"

## ⚠️ MANDATORY VALIDATION CHECKLIST ⚠️

**Before extracting ANY activity as school_activity, ALWAYS:**

1. **📋 GRID CHECK**: Is the activity in the regular timetable grid?
   - If YES → DO NOT extract as separate activity (it's part of school day)
   - If NO → Proceed to timing check
   - Examples: "Leksehjelp", "Matte", "Gym" in grid → Part of school schedule

2. **🕐 TIMING CHECK**: For activities NOT in grid, compare start time to that day's end time
   - If start_time < that_day's_end_time → DO NOT extract (part of school day)
   - If start_time >= that_day's_end_time → Extract as school_activity

3. **📍 LOCATION CHECK**: Homework must come from homework section, not schedule grid

4. **📅 DATE HANDLING**: Always set specific_date to null for one-time events

5. **🔄 DEDUPLICATION CHECK**: For special notes (Gym, Turdag, Uteskole, etc.)
   - Check if the same activity is mentioned in BOTH timetable grid AND notes/Husk sections
   - Verify the day matches in both mentions (e.g., "Turdag(fredag)" in Husk must match Friday in grid)
   - If same activity + same day → Extract only ONCE as a note
   - Example: "Høst-tur" on Friday grid + "Turdag(fredag)" in Husk = One "Turdag" note for Friday, not two

**⚠️ DOUBLE-CHECK**: If you see potential activities, first check if they're in the timetable grid. If they are, they're part of the school day!

## PROCESSING WORKFLOW

1. **First**: Identify school day boundaries for each day
   - Extract "Start" times from schedule
   - Find end times: Use explicit "Slutt" times OR last activity in timetable grid
   - Each day may have different end times - track them separately

2. **Then**: Process timetable grid content
   - ALL activities in the timetable grid → Part of school_schedule
   - **Extract special notes for each day:**
     - If "Leksehjelp" appears → Add "Leksehjelp" to that day's notes
     - If "Gym"/"Kroppsøving"/"PE" appears → Add "Gym" to that day's notes
     - If "Uteskole" appears → Add "Uteskole" to that day's notes
     - If "Turdag"/"tur"/"field trip" appears → Add "Turdag" to that day's notes
     - **For multiple notes**: Separate with commas (e.g., "Gym, Leksehjelp")
   - **Check for duplicate mentions**: Before finalizing notes, scan "Husk:" section
     - If "Turdag(day)" mentioned in Husk, verify it matches the grid day
     - Don't double-count the same activity - the grid mention is sufficient
   - Calculate school day duration from start to end of grid activities

3. **Next**: Look for activities OUTSIDE the timetable grid
   - Only activities mentioned outside the grid can be separate school_activities
   - Apply timing rule: must start at or after that day's end time
   - **Special attention to parent meetings**: Look for any variations of parent meeting terminology (foreldre*, foresatt* + meeting terms)

4. **Then**: Extract homework from dedicated homework section only

5. **Finally**: Format output according to specified JSON structure

**⚠️ REMEMBER**: The most critical step is checking if activities are in the timetable grid first!
