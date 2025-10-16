import { runQuery } from '../database.js';
import { formatLocalDate, getWeekStart, getSchoolYearRange } from './dates.js';

export function parseSchoolPlanResponse(responseText) {
  console.log(
    '🔄 Starting LLM response parsing (school_schedule + school_activities)...'
  );

  const datasets = {
    school_schedule: null,
    school_activities: null,
    school_homework: null,
  };

  try {
    console.log('📅 Parsing school_schedule...');
    const mondayIndex = responseText.indexOf('"Monday"');
    let scheduleStart = -1;

    if (mondayIndex !== -1) {
      for (let i = mondayIndex - 1; i >= 0; i--) {
        const char = responseText[i];
        if (char === '{') {
          scheduleStart = i;
          break;
        } else if (
          char !== ' ' &&
          char !== '\n' &&
          char !== '\r' &&
          char !== '\t'
        ) {
          break;
        }
      }
    }

    if (scheduleStart !== -1) {
      console.log('📅 Found schedule starting at position:', scheduleStart);

      let braceCount = 0;
      let scheduleEnd = scheduleStart;
      let inString = false;
      let escapeNext = false;

      for (let i = scheduleStart; i < responseText.length; i++) {
        const char = responseText[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              scheduleEnd = i;
              break;
            }
          }
        }
      }

      if (braceCount === 0) {
        const scheduleText = responseText.substring(
          scheduleStart,
          scheduleEnd + 1
        );
        console.log(`📋 Schedule JSON text: ${scheduleText}`);
        datasets.school_schedule = JSON.parse(scheduleText);
        console.log(
          `✅ Parsed school_schedule with ${Object.keys(datasets.school_schedule).length} days`
        );
      } else {
        console.log('❌ Could not find closing brace for schedule JSON');
      }
    } else {
      console.log('❌ Could not find school schedule in response');
    }

    console.log('🎯 Parsing school_activities...');

    const activitiesPatterns = [
      /\*\*Dataset 2 - school_activities:\*\*\s*```json\s*(\[[\s\S]*?\])\s*```/i,
      /Dataset 2 - school_activities:\s*```json\s*(\[[\s\S]*?\])\s*```/i,
      /Dataset 2 - school_activities:\s*(\[[\s\S]*?\])/i,
      /school_activities[:\s]*(\[[\s\S]*?\])/i,
      /activities[:\s]*(\[[\s\S]*?\])/i,
    ];

    let activitiesFound = false;

    for (const pattern of activitiesPatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        try {
          console.log(
            `🎯 Found activities pattern: ${match[1].substring(0, 100)}...`
          );

          let activitiesText = match[1].trim();

          let bracketCount = 0;
          let inString = false;
          let escapeNext = false;
          let endIndex = -1;

          for (let i = 0; i < activitiesText.length; i++) {
            const char = activitiesText[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"') {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '[') {
                bracketCount++;
              } else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  endIndex = i;
                  break;
                }
              }
            }
          }

          if (endIndex !== -1) {
            activitiesText = activitiesText.substring(0, endIndex + 1);
            console.log(`📋 Activities JSON text: ${activitiesText}`);

            const parsedActivities = JSON.parse(activitiesText);

            datasets.school_activities = parsedActivities.map(activity => ({
              day: activity.day,
              name: activity.name,
              start: activity.start,
              end: activity.end,
              type: activity.type || 'recurring',
              specific_date: activity.specific_date || null,
            }));

            console.log(
              `✅ Parsed school_activities with ${datasets.school_activities.length} activities`
            );
            console.log(
              `📊 Activity types: ${datasets.school_activities.map(a => `${a.name}:${a.type}`).join(', ')}`
            );
            activitiesFound = true;
            break;
          }
        } catch (parseError) {
          console.log(
            `⚠️  Failed to parse activities with pattern ${pattern}: ${parseError.message}`
          );
          continue;
        }
      }
    }

    if (!activitiesFound) {
      console.log('📝 No school_activities found in response');
      datasets.school_activities = [];
    }

    console.log('📚 Parsing school_homework...');
    try {
      const homeworkPattern =
        /Dataset 3[^:]*school_homework[^:]*:\s*```json\s*(\[[\s\S]*?\])\s*```/i;
      const homeworkMatch = responseText.match(homeworkPattern);

      if (homeworkMatch) {
        const homeworkJsonText = homeworkMatch[1].trim();
        console.log('📋 Homework JSON text:', homeworkJsonText);

        const parsedHomework = JSON.parse(homeworkJsonText);
        datasets.school_homework = Array.isArray(parsedHomework)
          ? parsedHomework
          : [];
        console.log(
          `✅ Parsed school_homework with ${datasets.school_homework.length} assignments`
        );

        if (datasets.school_homework.length > 0) {
          const subjects = datasets.school_homework
            .map(hw => hw.subject)
            .join(', ');
          console.log(`📖 Homework subjects: ${subjects}`);
        }
      } else {
        console.log('⚠️  No homework section found in LLM response');
        datasets.school_homework = [];
      }
    } catch (homeworkError) {
      console.error('❌ Error parsing homework:', homeworkError);
      datasets.school_homework = [];
    }

    return datasets;
  } catch (error) {
    console.error(`❌ JSON parsing error: ${error.message}`);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}

export async function saveExtractedSchoolPlan(
  memberId,
  extractedData,
  imageFileName,
  weekStartDate = null
) {
  console.log(`💾 Starting database save for member ${memberId}`);

  const savedData = {
    schedules: [],
    activities: [],
    homework: [],
  };

  try {
    const importDate = weekStartDate ? new Date(weekStartDate) : new Date();
    const { schoolYearStart, schoolYearEnd } = getSchoolYearRange(importDate);
    const importWeekStart = weekStartDate
      ? new Date(weekStartDate)
      : getWeekStart(importDate);

    const dayMapping = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
    };

    console.log(
      `📚 School year: ${schoolYearStart.toDateString()} to ${schoolYearEnd.toDateString()}`
    );
    console.log(`📆 Import week starts: ${importWeekStart.toDateString()}`);

    if (extractedData.school_schedule) {
      console.log(`📅 Processing recurring school schedule...`);

      console.log(
        `🧹 Cleaning up existing school schedules from ${formatLocalDate(importWeekStart)} onwards...`
      );
      const deleteResult = await runQuery(
        `DELETE FROM activities 
         WHERE member_id = ? 
         AND description LIKE '%[TYPE:school_schedule]%' 
         AND date >= ?`,
        [memberId, formatLocalDate(importWeekStart)]
      );
      console.log(
        `🗑️  Deleted ${deleteResult.changes || 0} existing school schedule entries`
      );

      console.log(`📦 Preparing batch insert for school schedule entries...`);

      const batchEntries = [];
      const allDayEntries = {};

      for (const [day, times] of Object.entries(
        extractedData.school_schedule
      )) {
        console.log(`📅 Processing day: ${day}, times:`, times);
        if (times && times.start && times.end) {
          const dayNum = dayMapping[day];
          console.log(`🗓️  Day ${day} mapped to number: ${dayNum}`);

          if (dayNum) {
            let currentWeek = new Date(importWeekStart);
            let entriesCreated = 0;
            allDayEntries[day] = [];

            while (currentWeek <= schoolYearEnd) {
              const targetDate = new Date(currentWeek);
              const dayDiff = dayNum - 1;
              targetDate.setDate(currentWeek.getDate() + dayDiff);

              if (
                targetDate >= importWeekStart &&
                targetDate <= schoolYearEnd
              ) {
                const dateString = formatLocalDate(targetDate);
                const notes = times.notes || null;

                batchEntries.push([
                  memberId,
                  'School',
                  dateString,
                  times.start,
                  times.end,
                  'Regular school schedule [TYPE:school_schedule]',
                  'school_schedule',
                  'weekly',
                  formatLocalDate(schoolYearEnd),
                  notes,
                ]);
                entriesCreated++;

                if (entriesCreated <= 10) {
                  allDayEntries[day].push({ day, date: dateString, ...times });
                }
              }

              currentWeek.setDate(currentWeek.getDate() + 7);
            }

            console.log(
              `📋 Prepared ${entriesCreated} entries for ${day} (batch)`
            );
          } else {
            console.log(`⚠️  Day ${day} not recognized in dayMapping`);
          }
        } else {
          console.log(`⚠️  Missing start/end times for ${day}:`, times);
        }
      }

      if (batchEntries.length > 0) {
        console.log(
          `💾 Executing batch insert for ${batchEntries.length} school schedule entries...`
        );
        const startTime = Date.now();

        const placeholders = batchEntries
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const flatParams = batchEntries.flat();

        await runQuery(
          `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes) 
           VALUES ${placeholders}`,
          flatParams
        );

        const endTime = Date.now();
        console.log(
          `✅ Batch insert completed in ${endTime - startTime}ms (${batchEntries.length} records)`
        );

        for (const [day, entries] of Object.entries(allDayEntries)) {
          for (const entry of entries) {
            savedData.schedules.push(entry);
          }
        }
      } else {
        console.log(`ℹ️  No school schedule entries to create`);
      }
    }

    if (
      extractedData.school_activities &&
      extractedData.school_activities.length > 0
    ) {
      console.log(`🎯 Processing school activities...`);

      console.log(
        `🧹 Cleaning up existing school activities from ${formatLocalDate(importWeekStart)} onwards...`
      );
      const deleteActivitiesResult = await runQuery(
        `DELETE FROM activities 
         WHERE member_id = ? 
         AND description LIKE '%[TYPE:school_activity]%' 
         AND date >= ?`,
        [memberId, formatLocalDate(importWeekStart)]
      );
      console.log(
        `🗑️  Deleted ${deleteActivitiesResult.changes || 0} existing school activity entries`
      );

      const batchActivityEntries = [];
      const activitySamples = [];

      for (const activity of extractedData.school_activities) {
        console.log(
          `🎯 Processing ${activity.type || 'recurring'} activity:`,
          activity
        );

        if (activity.day && activity.name && activity.start && activity.end) {
          const dayNum = dayMapping[activity.day];
          console.log(
            `🗓️  Activity "${activity.name}" on ${activity.day} (${dayNum}) ${activity.start}-${activity.end} - Type: ${activity.type || 'recurring'}`
          );

          if (dayNum) {
            const activityType = activity.type || 'recurring';
            const recurrenceType =
              activityType === 'recurring' ? 'weekly' : 'none';
            const recurrenceEndDate =
              activityType === 'recurring'
                ? formatLocalDate(schoolYearEnd)
                : null;

            if (activityType === 'one_time') {
              console.log(
                `📅 Preparing one-time entry for ${activity.name} (${activity.day})`
              );

              const targetDate = new Date(importWeekStart);
              const dayDiff = dayNum - 1;
              targetDate.setDate(importWeekStart.getDate() + dayDiff);
              console.log(
                `📍 Placing one-time activity on ${activity.day} of current week: ${formatLocalDate(targetDate)}`
              );

              if (
                targetDate >= importWeekStart &&
                targetDate <= schoolYearEnd
              ) {
                const dateString = formatLocalDate(targetDate);

                batchActivityEntries.push([
                  memberId,
                  activity.name,
                  dateString,
                  activity.start,
                  activity.end,
                  `School activity: ${activity.name} [TYPE:school_activity]`,
                  'school_activity',
                  recurrenceType,
                  recurrenceEndDate,
                ]);

                activitySamples.push({
                  day: activity.day,
                  name: activity.name,
                  date: dateString,
                  start: activity.start,
                  end: activity.end,
                  type: activityType,
                });

                console.log(
                  `📋 Prepared one-time entry for "${activity.name}" on ${dateString}`
                );
              } else {
                console.log(
                  `⚠️  One-time activity date ${formatLocalDate(targetDate)} is outside school year range`
                );
              }
            } else {
              console.log(
                `📅 Preparing recurring entries for ${activity.name} (${activity.day})`
              );

              let currentWeek = new Date(importWeekStart);
              let entriesCreated = 0;

              while (currentWeek <= schoolYearEnd) {
                const targetDate = new Date(currentWeek);
                const dayDiff = dayNum - 1;
                targetDate.setDate(currentWeek.getDate() + dayDiff);

                if (
                  targetDate >= importWeekStart &&
                  targetDate <= schoolYearEnd
                ) {
                  const dateString = formatLocalDate(targetDate);

                  batchActivityEntries.push([
                    memberId,
                    activity.name,
                    dateString,
                    activity.start,
                    activity.end,
                    `School activity: ${activity.name} [TYPE:school_activity]`,
                    'school_activity',
                    recurrenceType,
                    recurrenceEndDate,
                  ]);
                  entriesCreated++;

                  if (entriesCreated <= 5) {
                    activitySamples.push({
                      day: activity.day,
                      name: activity.name,
                      date: dateString,
                      start: activity.start,
                      end: activity.end,
                      type: activityType,
                    });
                  }
                }

                currentWeek.setDate(currentWeek.getDate() + 7);
              }

              console.log(
                `📋 Prepared ${entriesCreated} recurring entries for activity "${activity.name}"`
              );
            }
          } else {
            console.log(`⚠️  Day ${activity.day} not recognized in dayMapping`);
          }
        } else {
          console.log(`⚠️  Missing required fields for activity:`, activity);
        }
      }

      if (batchActivityEntries.length > 0) {
        console.log(
          `💾 Executing batch insert for ${batchActivityEntries.length} school activity entries...`
        );
        const startTime = Date.now();

        const placeholders = batchActivityEntries
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const flatParams = batchActivityEntries.flat();

        await runQuery(
          `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date) 
           VALUES ${placeholders}`,
          flatParams
        );

        const endTime = Date.now();
        console.log(
          `✅ Batch insert completed in ${endTime - startTime}ms (${batchActivityEntries.length} records)`
        );

        savedData.activities.push(...activitySamples);
      } else {
        console.log(`ℹ️  No school activity entries to create`);
      }
    } else {
      console.log('📝 No school activities to process');
    }

    if (
      extractedData.school_homework &&
      extractedData.school_homework.length > 0
    ) {
      console.log(
        `📚 Processing ${extractedData.school_homework.length} homework assignments...`
      );

      const homeworkWeekStart = formatLocalDate(importWeekStart);
      console.log(
        `📅 Assigning homework to week starting: ${homeworkWeekStart}`
      );

      console.log(
        `🧹 Cleaning up existing extracted homework for week ${homeworkWeekStart}...`
      );
      try {
        const deleteHomeworkResult = await runQuery(
          `DELETE FROM homework 
           WHERE member_id = ? 
           AND week_start_date = ?
           AND extracted_from_image IS NOT NULL`,
          [memberId, homeworkWeekStart]
        );
        console.log(
          `🗑️  Deleted ${deleteHomeworkResult.changes || 0} existing extracted homework entries`
        );
      } catch (deleteError) {
        console.error('⚠️  Error cleaning up existing homework:', deleteError);
      }

      for (const homework of extractedData.school_homework) {
        if (homework.subject && homework.assignment) {
          try {
            const result = await runQuery(
              `INSERT INTO homework (member_id, subject, assignment, week_start_date, extracted_from_image) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                memberId,
                homework.subject,
                homework.assignment,
                homeworkWeekStart,
                imageFileName,
              ]
            );

            savedData.homework.push({
              id: result.id,
              subject: homework.subject,
              assignment: homework.assignment,
              week_start_date: homeworkWeekStart,
              extracted_from_image: imageFileName,
            });

            console.log(
              `✅ Saved homework: ${homework.subject} - ${homework.assignment.substring(0, 50)}${homework.assignment.length > 50 ? '...' : ''}`
            );
          } catch (homeworkError) {
            console.error(
              `❌ Error saving homework for ${homework.subject}:`,
              homeworkError
            );
          }
        } else {
          console.log(`⚠️  Skipping homework with missing data:`, homework);
        }
      }

      console.log(
        `📚 Homework processing completed: ${savedData.homework.length} assignments saved`
      );
    } else {
      console.log('📝 No homework assignments to process');
    }

    console.log(`✅ Database save completed successfully`);
    return savedData;
  } catch (error) {
    console.error('❌ Error saving extracted school plan:', error);
    throw error;
  }
}
