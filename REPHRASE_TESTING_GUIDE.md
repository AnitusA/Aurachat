# Testing Guide: Message Rephrase Feature

## Quick Start

### 1. Start Backend
```powershell
cd d:\Aurachat\backend
python run.py
```
Look for: `[Rephrase]` logs when testing

### 2. Start Frontend
```powershell
cd d:\Aurachat\frontend
npm start
```

### 3. Open Messages Page
- Login with two accounts or use two browser windows
- Open Messages page in both

## Test Cases

### Test 1: Short Message (Should NOT trigger rephrase)
**Steps:**
1. Type: "Hi there"
2. Wait 2 seconds
3. **Expected**: No rephrase suggestion appears

### Test 2: Long Message (Should trigger rephrase)
**Steps:**
1. Type: "I had an amazing experience at the coffee shop yesterday and I saw the most beautiful sunset while sitting by the window with my friends and we talked about life and dreams"
2. Wait 1.5 seconds after stopping
3. **Expected**: 
   - "✨ Improved version" card appears below input
   - Shows a clearer, more concise version
   - Backend logs show `[Rephrase] ✓ SUCCESS`

### Test 3: Use Rephrase Suggestion
**Steps:**
1. Type a long story (50+ chars)
2. Wait for rephrase to appear
3. Click "Use this" button
4. **Expected**:
   - Input field is populated with rephrased text
   - Suggestion card disappears
   - User can send the improved version

### Test 4: Dismiss Rephrase Suggestion
**Steps:**
1. Type a long story
2. Wait for rephrase to appear
3. Click "Dismiss" button
4. **Expected**:
   - Suggestion card disappears
   - Original text remains in input
   - User can still edit and send original

### Test 5: Edit After Rephrase
**Steps:**
1. Type: "I really really really like the color blue because it reminds me of the sky"
2. Wait for rephrase to appear
3. Edit the message (add more text or modify)
4. **Expected**:
   - Suggestion updates (or clears if < 50 chars)
   - Reflects the changes made

### Test 6: Fallback Rephrase (API Disabled)
**Steps:**
1. Temporarily rename/remove GEMINI_API_KEY from .env
2. Type a long message (50+ chars)
3. Wait 1.5 seconds
4. **Expected**:
   - Backend logs show `[Rephrase] ✗ Gemini failed` or fallback message
   - Rephrase still appears (using local fallback)
   - Fallback is basic but functional

### Test 7: Multiple Messages in Sequence
**Steps:**
1. Type and rephrase message 1, send it
2. Type and rephrase message 2, send it
3. Type message 3 (< 50 chars), verify no rephrase
4. **Expected**:
   - Each long message gets independent rephrase
   - Short messages don't trigger feature
   - No interference between messages

### Test 8: Real Conversation Flow
**Steps:**
1. Have User A send a message to User B
2. User B receives and replies
3. User B types a long detailed reply
4. Rephrase appears
5. User B accepts the rephrase and sends
6. User A receives the improved message
7. **Expected**:
   - Natural conversation flow
   - No performance issues
   - Backend logs show all activity

## Backend Log Inspection

### Look for these logs:
```
[Rephrase] Input: "..." | Length: XXX chars
[Rephrase] Gemini configured: Key=True, URL=True
[Rephrase] Calling Gemini API
[Rephrase] Gemini response status: 200
[Rephrase] ✓ SUCCESS: Generated rephrase
[Rephrase] Original: "..."
[Rephrase] Rephrased: "..."
```

### API Failure Logs:
```
[Rephrase] ✗ Gemini failed: [error message]
[Rephrase] Falling back to local rephrase...
[Rephrase] → Using local fallback rephrase
[Rephrase] → Local rephrase: "..."
```

## Frontend Console Logs

### Success:
```
[Messages] Rephrase suggestion: "improved text here"
```

### Error:
```
[Messages] Error fetching rephrase: [error details]
```

## Performance Testing

### Test UI Responsiveness:
1. Type a very long message (500+ chars)
2. Keep editing quickly
3. **Expected**: UI remains responsive, no lag

### Test API Performance:
1. Type multiple long messages rapidly
2. Each should get own rephrase (debounced)
3. **Expected**: No duplicate API calls, smooth experience

## Edge Cases to Test

| Case | Input | Expected Result |
|------|-------|-----------------|
| Empty message | "" | No rephrase |
| Very short | "Hi" | No rephrase |
| Exactly 50 chars | "a" × 50 | Rephrase should trigger |
| Just under 50 | "a" × 49 | No rephrase |
| Special characters | "!!!???***" | Fallback rephrase |
| Links | "Check this out: https://..." | Rephrase (if > 50) |
| Emojis | "Hello 😊 this is nice 🎉" | Rephrase (if > 50) |
| Multiple languages | "Bonjour, ça va bien?" | Depends on Gemini |

## Troubleshooting

### Rephrase not appearing:
- ✓ Check message length (must be ≥ 50 chars)
- ✓ Wait 1.5 seconds after stopping typing
- ✓ Check backend logs for errors
- ✓ Verify API key is valid in .env

### Rephrase UI looks broken:
- ✓ Clear browser cache (Ctrl+Shift+Delete)
- ✓ Refresh page (Ctrl+R)
- ✓ Check browser console for JS errors (F12)

### API returning errors:
- ✓ Verify GEMINI_API_KEY is correct in .env
- ✓ Check internet connection
- ✓ Verify GEMINI_API_URL is correct
- ✓ Check Gemini API quota/limits

### Slow rephrase response:
- ✓ Check network latency (F12 → Network tab)
- ✓ Verify API is responding (curl test)
- ✓ Check Gemini API service status

## Success Criteria

- [x] Rephrase triggers for messages ≥ 50 characters
- [x] Rephrase appears 1-2 seconds after typing stops
- [x] "Use this" button correctly populates input
- [x] "Dismiss" button clears the suggestion
- [x] Fallback works when API is unavailable
- [x] Backend logs are clear and helpful
- [x] No performance impact on messaging
- [x] UI is responsive and non-intrusive

---

**Last Updated**: Current session
**Ready for**: Manual testing in development environment
