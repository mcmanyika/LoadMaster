# Google Places API Setup

This guide explains how to set up Google Places Autocomplete for the city input fields in the Load Form.

## Overview

The Load Form uses Google Places Autocomplete to provide city suggestions as users type in the Origin and Destination fields. This improves user experience and ensures consistent city name formatting.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A GCP project with billing enabled (Google provides $200/month free credit)

## Setup Steps

### 1. Create or Select a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Required APIs

**IMPORTANT:** You need to enable **TWO** APIs:

1. **Maps JavaScript API** (Required)
   - In the Google Cloud Console, navigate to **APIs & Services** > **Library**
   - Search for "Maps JavaScript API"
   - Click on **Maps JavaScript API** and click **Enable**

2. **Places API** (Required)
   - Still in **APIs & Services** > **Library**
   - Search for "Places API"
   - Click on **Places API** and click **Enable**

**Note:** Both APIs must be enabled. The Maps JavaScript API loads the client-side library, and the Places API provides the autocomplete functionality.

### 3. Create an API Key

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy your API key (you'll need this in the next step)

### 4. Restrict the API Key (Recommended for Security)

1. Click on your newly created API key to edit it
2. Under **API restrictions**, select **Restrict key**
3. Under **Select APIs**, choose **BOTH**:
   - **Maps JavaScript API**
   - **Places API**
4. Under **Application restrictions**, you can optionally restrict by:
   - **HTTP referrers** (for web apps): Add your domain(s)
   - **IP addresses**: Add your server IPs
5. Click **Save**

### 5. Add API Key to Your Project

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following line:

```env
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual API key.

3. Restart your development server for the changes to take effect

### 6. Verify the Setup

1. Start your development server: `npm run dev`
2. Navigate to the Load Form
3. Click on the Origin or Destination field
4. Start typing a city name (e.g., "Dallas")
5. You should see autocomplete suggestions appear

## Features

- **City-only suggestions**: The autocomplete is restricted to cities, not full addresses
- **US cities**: By default, restricted to US cities (can be modified in `PlacesAutocomplete.tsx`)
- **Formatted output**: Results are formatted as "City, ST" (e.g., "Dallas, TX")
- **Clear button**: Users can easily clear the input field

## Troubleshooting

### Autocomplete not working

1. **Check API key**: Verify your API key is correct in `.env`
2. **Check API is enabled**: Ensure Places API is enabled in Google Cloud Console
3. **Check browser console**: Look for any error messages
4. **Check billing**: Ensure billing is enabled on your GCP project (even if you're using free credits)
5. **Check API restrictions**: If you restricted the API key, ensure your domain/IP is allowed

### API key errors

- **"This API project is not authorized to use this API"**: Enable Places API in Google Cloud Console
- **"RefererNotAllowedMapError"**: Add your domain to the API key restrictions
- **"REQUEST_DENIED"**: Check that Places API is enabled and billing is set up

### Cost Considerations

- Google provides $200/month in free credits
- Places API Autocomplete costs:
  - **Per session**: $2.83 per 1,000 sessions
  - A session includes all autocomplete requests from when a user starts typing until they select a place
- For most small to medium applications, the free tier should be sufficient
- Monitor your usage in the Google Cloud Console

## Customization

To modify the autocomplete behavior, edit `components/PlacesAutocomplete.tsx`:

- **Remove US restriction**: Remove `componentRestrictions: { country: 'us' }`
- **Allow full addresses**: Change `types: ['(cities)']` to `types: ['geocode']`
- **Add more fields**: Add fields to the `fields` array to get more place data

## Support

For more information:
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Places Autocomplete Documentation](https://developers.google.com/maps/documentation/javascript/places-autocomplete)
- [Google Cloud Console](https://console.cloud.google.com/)

