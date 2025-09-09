Extract the daily time information from this school schedule image, organizing it into three separate datasets: school_schedule, school_activities, and school_homework.

DEFINITIONS:

- "school_schedule": The mandatory school day from "Start" to "Slutt" times
- "school_activities": Optional activities outside regular school hours (e.g., "Leksehjelp", parent meetings)
- "school_homework": Assignments listed in the homework section (typically under "Lekser" or "Lekser til fredag")

EXTRACTION RULES:

1. school_schedule dataset:
   - Start time: Look for "Start" followed by HH:MM  
   - End time: Look for "Slutt" followed by HH:MM - this marks the END of regular school hours
   - CRITICAL: The "Slutt" time is when regular classes end, NOT when after-school activities end
   - Do NOT include "Leksehjelp" or other after-school activities in the school day duration
   - If "Leksehjelp" appears after regular classes, it should be extracted as a separate school_activity
   - Notes: Extract short 1-3 word notes that appear within the school day schedule for each day
     - Look for special activities like "Gym", "Kroppsøving", "Uteskole", "PE", "Turdag", "Svømming" etc.
     - These indicate special preparation requirements for parents (sports clothes, outdoor gear, etc.)
     - Only include notes that appear during regular school hours (between Start and Slutt times)
     - NORMALIZE PE-related terms: Use "Gym" for any PE/sports activities (Kroppsøving, PE, Gym, etc.)
     - If no special notes are found for a day, use an empty string ""

2. school_activities dataset:
   - ONLY extract activities that start AT OR AFTER the "Slutt" time for that specific day
   - DO NOT extract activities that occur DURING regular school hours (between "Start" and "Slutt")
   - Activities within the school day (like "Lekekurs", regular subjects, breaks) are part of the school schedule, NOT separate activities
   - ONLY extract: afternoon/evening activities, homework help sessions, parent meetings that occur after school ends
   - Key principle: If an activity starts after the "Slutt" time, it's a separate activity; if it starts before "Slutt", it's part of the regular school day
   
   ACTIVITY TYPE CLASSIFICATION:
   - "recurring": Regular activities that happen weekly (e.g., "Leksehjelp")
   - "one_time": Single events or meetings (look for words like "Husk", "møte", "foreldremøte", specific dates)
   - "exam": Tests, exams, or assessment activities
   
   TEMPORAL INDICATORS:
   - Words like "Husk" (remember), "møte" (meeting), "foreldremøte" (parent meeting) usually indicate one-time events
   - Regular activities like "Leksehjelp" (homework help) are typically recurring
   - Activities with specific dates or "denne uken" (this week) are one-time events

3. school_homework dataset:
   - Find the homework table/section (contains "Lekser" or "Læringsmål og lekser")
   - Extract subject name and corresponding homework text
   - Skip "Mål" (goals) column - only extract actual homework assignments

OUTPUT FORMAT:

Dataset 1 - school_schedule:
{
"Monday": {"start": "HH:MM", "end": "HH:MM", "notes": ""},
"Tuesday": {"start": "HH:MM", "end": "HH:MM", "notes": ""},
"Wednesday": {"start": "HH:MM", "end": "HH:MM", "notes": ""},
"Thursday": {"start": "HH:MM", "end": "HH:MM", "notes": ""},
"Friday": {"start": "HH:MM", "end": "HH:MM", "notes": ""}
}

Dataset 2 - school_activities:
[
{"day": "[day]", "name": "[activity name]", "start": "HH:MM", "end": "HH:MM", "type": "[recurring|one_time|exam]", "specific_date": null},
...
]

Dataset 3 - school_homework:
[
{"subject": "[subject name]", "assignment": "[homework description]"},
...
]

EXTRACTION APPROACH:

Apply timing-based logic to determine what should be extracted:
1. Activities after school ends → Extract with appropriate type classification
2. Activities during school hours → Part of regular curriculum, do not extract

IMPORTANT DATE HANDLING:
- For one-time events, ALWAYS set specific_date to null
- The system will automatically place one-time events on the corresponding day of the current import week
- Example: if "Foreldremøte" is on "Tuesday", it will be scheduled for the Tuesday of the current week
- DO NOT attempt to extract or infer specific dates from the schedule image

GENERAL PRINCIPLES:
- Extract activities based on timing relative to school day boundaries, not specific names
- Focus on when activities occur, not what they're called
- After-school activities are separate events; in-school activities are part of the curriculum
