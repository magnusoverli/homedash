import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../config/constants.js';
import {
  parseSchoolPlanResponse,
  saveExtractedSchoolPlan,
} from '../utils/schoolPlanParser.js';

const router = express.Router();

router.use(requireAuth);

router.post('/extract', upload.single('schoolPlanImage'), async (req, res) => {
  const { member_id, api_key, selected_model, week_start_date } = req.body;
  const imageFile = req.file;

  console.log('=== SCHOOL PLAN EXTRACTION STARTED ===');
  console.log(`Member ID: ${member_id}`);
  console.log(`Image file: ${imageFile ? imageFile.originalname : 'none'}`);
  console.log(
    `Image size: ${imageFile ? (imageFile.size / 1024).toFixed(2) : 0} KB`
  );
  console.log(`Image type: ${imageFile ? imageFile.mimetype : 'none'}`);
  console.log(
    `API key provided: ${api_key ? 'Yes (length: ' + api_key.length + ')' : 'No'}`
  );
  console.log(
    `Selected model: ${selected_model || 'Not specified (will use default)'}`
  );
  console.log(
    `Week start date: ${week_start_date || 'Not specified (will use current week)'}`
  );

  if (!member_id || !api_key || !imageFile) {
    console.log('❌ Validation failed - missing required fields');
    return res.status(400).json({
      error: 'member_id, api_key, and schoolPlanImage are required',
    });
  }

  try {
    const promptPath = path.join(process.cwd(), 'llm_prompt.md');
    const prompt = await fs.readFile(promptPath, 'utf8');
    console.log(`📄 Prompt loaded successfully (${prompt.length} characters)`);

    const imageBase64 = imageFile.buffer.toString('base64');
    const imageMimeType = imageFile.mimetype;
    console.log(
      `🖼️  Image converted to base64 (${imageBase64.length} characters)`
    );
    console.log(`📡 Sending request to Anthropic API...`);

    const modelToUse = selected_model || 'claude-3-5-sonnet-20241022';
    console.log(`🤖 Using model: ${modelToUse}`);

    const contentType =
      imageMimeType === 'application/pdf' ? 'document' : 'image';

    const messageData = {
      model: modelToUse,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: contentType,
              source: {
                type: 'base64',
                media_type: imageMimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.log(
        `❌ Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
      return res.status(response.status).json({
        error: 'Failed to extract school plan',
        message: errorData.error?.message || 'Unknown error from Anthropic API',
      });
    }

    const data = await response.json();
    const extractedText = data.content[0].text;
    console.log(`✅ Anthropic API response received`);
    console.log(`📝 Extracted text length: ${extractedText.length} characters`);
    console.log('--- RAW LLM RESPONSE ---');
    console.log(extractedText);
    console.log('--- END RAW RESPONSE ---');

    let extractedData;
    try {
      console.log('🔍 Parsing LLM response for datasets...');
      extractedData = parseSchoolPlanResponse(extractedText);
      console.log('✅ Parsing successful');
      console.log(`📊 Parsed datasets:`);
      console.log(
        `   - school_schedule: ${extractedData.school_schedule ? Object.keys(extractedData.school_schedule).length : 0} days`
      );
      console.log(
        `   - school_activities: ${extractedData.school_activities ? extractedData.school_activities.length : 0} activities`
      );
      console.log(
        `   - school_homework: ${extractedData.school_homework ? extractedData.school_homework.length : 0} assignments`
      );
    } catch (parseError) {
      console.error('❌ Error parsing LLM response:', parseError);
      return res.status(400).json({
        error: 'Failed to parse extracted data',
        message: 'The AI response could not be parsed into the expected format',
        rawResponse: extractedText,
      });
    }

    console.log('💾 Saving extracted data to database...');
    const savedData = await saveExtractedSchoolPlan(
      member_id,
      extractedData,
      imageFile.originalname,
      week_start_date
    );
    console.log('✅ Data saved successfully');
    console.log(`📈 Saved records:`);
    console.log(`   - schedules: ${savedData.schedules.length}`);
    console.log(`   - activities: ${savedData.activities.length}`);
    console.log(`   - homework: ${savedData.homework.length}`);

    console.log('🎉 SCHOOL PLAN EXTRACTION COMPLETED SUCCESSFULLY');

    res.json({
      success: true,
      message: 'School plan extracted successfully',
      extractedData: extractedData,
      savedData: savedData,
    });
  } catch (error) {
    console.error('❌ Error extracting school plan:', error);
    console.log('💥 SCHOOL PLAN EXTRACTION FAILED');

    if (error.name === 'AbortError') {
      console.log('⏰ Request timed out');
      return res.status(500).json({
        error: 'Request timed out',
        message: 'The extraction request took too long. Please try again.',
      });
    }

    console.log(`🚨 Error details: ${error.message}`);
    res.status(500).json({
      error: 'Failed to extract school plan',
      message: error.message,
    });
  }
});

export default router;
