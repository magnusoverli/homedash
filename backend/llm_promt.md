Extract the daily time information from this school schedule image, organizing it into three separate datasets: school_schedule, school_activities, and school_homework.

DEFINITIONS:

- "school_schedule": The mandatory school day from "Start" to "Slutt" times
- "school_activities": Optional activities outside regular school hours (e.g., "Leksehjelp", parent meetings)
- "school_homework": Assignments listed in the homework section (typically under "Lekser" or "Lekser til fredag")

EXTRACTION RULES:

1. school_schedule dataset:
   - Start time: Look for "Start" followed by HH:MM
   - End time: Look for "Slutt" followed by HH:MM
   - IMPORTANT: Do NOT extend the school day end time for "Leksehjelp" activities

2. school_activities dataset:
   - Activities scheduled AFTER "Slutt" time
   - Afternoon/evening activities (can start as early as 13:00)
   - SPECIAL CASE: "Leksehjelp" activities that start at or after "Slutt" time must ALWAYS be extracted as separate activities, even if they start exactly when school ends
   - Examples: "Leksehjelp", parent meetings, evening events

3. school_homework dataset:
   - Find the homework table/section (contains "Lekser" or "Læringsmål og lekser")
   - Extract subject name and corresponding homework text
   - Skip "Mål" (goals) column - only extract actual homework assignments

OUTPUT FORMAT:

Dataset 1 - school_schedule:
{
"Monday": {"start": "HH:MM", "end": "HH:MM"},
"Tuesday": {"start": "HH:MM", "end": "HH:MM"},
"Wednesday": {"start": "HH:MM", "end": "HH:MM"},
"Thursday": {"start": "HH:MM", "end": "HH:MM"},
"Friday": {"start": "HH:MM", "end": "HH:MM"}
}

Dataset 2 - school_activities:
[
{"day": "[day]", "name": "[activity name]", "start": "HH:MM", "end": "HH:MM"},
...
]

Dataset 3 - school_homework:
[
{"subject": "[subject name]", "assignment": "[homework description]"},
...
]
