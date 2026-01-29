# Local Testing Guide for DRM Experiment

## Prerequisites
You need Node.js and npm installed on your machine.

## Step-by-Step Testing Instructions

### 1. Set Up the Database (ONE TIME ONLY)

Before testing, create the DRM results table in Supabase:

1. Go to https://supabase.com and log in
2. Open your project
3. Click "SQL Editor" in the left sidebar
4. Copy the entire contents of `supabase-drm-schema.sql`
5. Paste into the SQL editor
6. Click "Run" to execute
7. Verify the table was created by going to "Table Editor" → you should see `drm_results`

### 2. Start the Development Server

Open a terminal in the project directory and run:

```bash
cd "I:\My Drive\code\claudeCode\playin"
npm run dev
```

This will start the Next.js development server, usually at `http://localhost:3000`

### 3. Test the Complete Flow

#### A. Home Page
1. Open `http://localhost:3000` in your browser
2. You should see two experiment cards: "Stroop Effect" and "False Memory (DRM)"
3. Click on "False Memory (DRM)"

#### B. DRM Landing Page
1. You should see the DRM landing page with instructions in Hebrew/English
2. Enter a test name (e.g., "Test User")
3. Click "התחל ניסוי" (Start Experiment)

#### C. Study Phase
1. You'll see words presented one at a time
2. There are now **150 words total** (10 lists × 15 words each)
3. Each word appears for 2 seconds
4. Progress bar shows your position (e.g., "45 / 150")
5. **Expected duration: ~5 minutes**
6. Wait for all words to complete (or you can refresh to skip for testing)

#### D. Test Phase
1. After study completes, you'll see "המשך לבדיקה" (Continue to Test)
2. Click it to go to the recognition test
3. You'll see **60 test items** (10 lists × 6 items each):
   - 30 studied words
   - 10 critical lures (never presented!)
   - 10 related distractors
   - 10 unrelated distractors
4. For each word, click either:
   - "כן, ראיתי" (Yes, I saw it - OLD)
   - "לא, לא ראיתי" (No, I didn't see it - NEW)
5. Progress bar shows (e.g., "15 / 60")

#### E. Completion
1. After all 60 items, you'll see "!תודה" (Thank you!)
2. Data is automatically saved to Supabase

### 4. Check the Teacher Dashboard

1. Go to `http://localhost:3000/drm/teacher`
2. You should see:
   - **Total Participants**: 1 (or more if you tested multiple times)
   - **Total Responses**: 60 (or 60 × number of participants)
   - **Recognition Rates Chart**: Shows hit rate, critical lure rate, etc.
   - **Serial Position Curve**: NEW! Shows recall rate by position (1-15)

### 5. Expected Results

**Recognition Rates:**
- **Hit Rate** (studied words): Should be high (~70-90%)
- **Critical Lure Rate**: Should be surprisingly high! (~60-80%) - This is the false memory effect
- **Related FA Rate**: Moderate (~30-50%)
- **Unrelated FA Rate**: Low (~10-20%) - baseline false alarm rate

**Serial Position Curve:**
- **Primacy effect**: Positions 1-3 should have higher recall (people remember first items)
- **Recency effect**: Positions 13-15 should have higher recall (people remember last items)
- **Middle positions**: Lower recall (the "forgetting curve")

### 6. Mobile Testing

1. While the dev server is running, find your computer's local IP address:
   - Windows: Open CMD and type `ipconfig` → look for "IPv4 Address"
   - Mac/Linux: Type `ifconfig` → look for inet address

2. On your phone (connected to same WiFi), open:
   ```
   http://[YOUR-IP]:3000/drm
   ```
   Example: `http://192.168.1.100:3000/drm`

3. Test the complete flow on mobile - it should be phone-friendly

### 7. Verify Data in Supabase

1. Go to Supabase → Table Editor → `drm_results`
2. You should see 60 rows per participant
3. Check that columns include:
   - `session_id` (same for all 60 rows from one participant)
   - `participant_name` (your test name)
   - `word` (the word shown)
   - `item_type` (studied, critical_lure, related_distractor, unrelated_distractor)
   - `serial_position` (1-15 for studied items, null for others)
   - `response` (old/new)
   - `is_correct` (true/false)
   - `reaction_time_ms`

### 8. Common Issues & Fixes

**Problem: "No data available yet"**
- Make sure you completed the full test flow
- Check Supabase table to verify data was saved
- Click "Refresh Data" on teacher dashboard

**Problem: Serial Position Curve is flat or empty**
- You need at least one participant to complete the experiment
- Make sure `serial_position` values are being saved (check Supabase)

**Problem: npm command not found**
- Install Node.js from https://nodejs.org
- Restart your terminal after installation

**Problem: Module not found errors**
- Run `npm install` in the project directory first
- This installs all dependencies

### 9. Clean Up Test Data (Optional)

To delete test data and start fresh:

1. Go to Supabase SQL Editor
2. Run: `DELETE FROM drm_results;`
3. This removes all rows from the table

## Ready to Deploy?

Once local testing looks good:
1. Commit all changes with git
2. Push to GitHub
3. Vercel will automatically deploy

The DRM experiment is now production-ready!
