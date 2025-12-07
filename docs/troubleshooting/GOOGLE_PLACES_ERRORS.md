# Troubleshooting Google Places Autocomplete Errors

## Common Error: "Oops! Something went wrong."

This error typically appears when there's an issue with the Google Places API configuration. Here's how to fix it:

### Step 1: Verify API Key

1. Check your `.env` file has the correct key:
   ```env
   VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

2. Restart your development server after adding/changing the API key:
   ```bash
   npm run dev
   ```

### Step 2: Enable Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for "Places API"
4. Click on it and ensure it's **Enabled**
5. If not enabled, click **Enable**

### Step 3: Check API Key Restrictions

1. Go to **APIs & Services** > **Credentials**
2. Click on your API key
3. Check **API restrictions**:
   - Should include "Places API" or be unrestricted
4. Check **Application restrictions**:
   - If set to "HTTP referrers", ensure your domain is added
   - If set to "IP addresses", ensure your IP is added
   - For development, you can temporarily set to "None" to test

### Step 4: Verify Billing

1. Go to **Billing** in Google Cloud Console
2. Ensure billing is enabled (even if using free credits)
3. Google provides $200/month in free credits

### Step 5: Test API Key Directly

Test your API key in the browser console:

```javascript
// Open browser console and run:
const apiKey = 'YOUR_API_KEY';
fetch(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`)
  .then(response => {
    if (response.ok) {
      console.log('API key is valid');
    } else {
      console.error('API key error:', response.status);
    }
  });
```

### Step 6: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for error messages related to Google Maps
4. Common errors:
   - `RefererNotAllowedMapError`: Add your domain to API key restrictions
   - `This API project is not authorized`: Enable Places API
   - `REQUEST_DENIED`: Check API key and billing

### Step 7: Verify Script Loading

Check if the Google Maps script is loading:

1. Open browser Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "maps.googleapis.com"
4. Check if the request is successful (status 200)
5. If you see 403 or 400, there's an API key issue

## Quick Fix Checklist

- [ ] API key is in `.env` file as `VITE_GOOGLE_PLACES_API_KEY`
- [ ] Development server restarted after adding API key
- [ ] Places API is enabled in Google Cloud Console
- [ ] Billing is enabled (even with free credits)
- [ ] API key restrictions allow your domain/IP
- [ ] No errors in browser console
- [ ] Google Maps script loads successfully (check Network tab)

## Still Having Issues?

1. **Create a new API key**:
   - Sometimes regenerating the key helps
   - Make sure to enable Places API before creating the key

2. **Check quota limits**:
   - Go to **APIs & Services** > **Dashboard**
   - Check if you've exceeded any quotas

3. **Test with unrestricted key** (temporarily):
   - Remove all restrictions from the API key
   - Test if autocomplete works
   - If it works, the issue is with restrictions
   - Re-add restrictions properly

4. **Check API key format**:
   - Should start with `AIza`
   - Should be about 39 characters long
   - No spaces or extra characters

## Fallback Behavior

If the Google Places API fails to load, the component will fall back to a regular text input. You can still manually type city names in the format "City, ST".

