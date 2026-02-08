# Automatic Data Upload Feature

## Overview
The extension now automatically uploads detected tracker and cookie data to the backend API every 20 seconds.

## Configuration

### Enable/Disable Auto-Upload
To disable automatic uploads, modify the `DEFAULT_CONFIG` in `background/background.js`:

```javascript
const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:8000',
  syncIntervalMinutes: 15,
  dashboardUrl: '',
  autoUploadEnabled: false,  // Set to false to disable
  uploadIntervalSeconds: 20
};
```

### Change Upload Frequency
Adjust the `uploadIntervalSeconds` value (minimum 20 seconds recommended):

```javascript
uploadIntervalSeconds: 60  // Upload every 60 seconds instead
```

### Change Backend URL
Update the `apiUrl` to point to your backend:

```javascript
apiUrl: 'https://your-backend.com'  // Production backend
```

## How It Works

1. **Detection**: Extension detects trackers and cookies in real-time as you browse
2. **Storage**: Data is temporarily stored in memory (per tab)
3. **Upload**: Every 20 seconds, all accumulated data is sent to the backend API
4. **Cleanup**: After successful upload, the data is cleared to avoid duplicates

## Manual Upload

You can also manually trigger an upload from the extension popup by sending a message:

```javascript
chrome.runtime.sendMessage({ type: 'FORCE_UPLOAD' }, (response) => {
  console.log(response);
});
```

## Backend Endpoint

The extension sends data to: `POST /api/trackers`

Expected response format:
```json
{
  "message": "Data received successfully",
  "trackers_saved": 10,
  "cookies_saved": 5
}
```

## Logging

Watch the browser console (Inspect > Service Worker) for upload status:
- 📤 = Uploading data
- ✅ = Upload successful
- ❌ = Upload failed
- 📭 = No data to upload
- ⚠️ = Configuration issue

## Troubleshooting

### Uploads not working?
1. Check that `autoUploadEnabled: true` in config
2. Verify `apiUrl` is set correctly
3. Ensure backend is running (`python3 api.py`)
4. Check browser console for error messages

### Want to test without uploading?
Set `autoUploadEnabled: false` in the config, then use manual upload when needed.
