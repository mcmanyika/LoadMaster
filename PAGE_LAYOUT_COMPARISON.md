# Page Layout Comparison

## Current Layout Structure

**NO**, not all pages use the same template. Here's the breakdown:

### Pages with Standard Layout (Dashboard, Loads, Fleet)

These pages use the **standard App.tsx layout**:
- ✅ Sidebar navigation (left)
- ✅ Header bar (top)
- ✅ Standard content wrapper: `<div className="max-w-7xl mx-auto px-6 py-8 space-y-8">`
- ✅ Consistent spacing and padding

### Pricing Page

The Pricing page has a **different layout**:
- ✅ Uses sidebar navigation (from App.tsx)
- ✅ Uses header bar (from App.tsx)
- ❌ **Different wrapper**: Has its own full-page background gradient
- ❌ **Different padding**: Uses `py-12 px-4 sm:px-6 lg:px-8` instead of standard `px-6 py-8`
- ✅ Content wrapper: `max-w-7xl mx-auto`

### Subscriptions Page

The Subscriptions page has a **slightly different wrapper**:
- ✅ Uses sidebar navigation (from App.tsx)
- ✅ Uses header bar (from App.tsx)
- ❌ **Different wrapper**: `<div className="p-6 max-w-6xl mx-auto">` (max-width 6xl instead of 7xl)
- ❌ **Different padding**: Uses `p-6` instead of standard `px-6 py-8`

## Summary

| Page | Sidebar | Header | Wrapper | Max Width | Padding |
|------|---------|--------|---------|-----------|---------|
| Dashboard | ✅ | ✅ | Standard | 7xl | px-6 py-8 |
| Loads | ✅ | ✅ | Standard | 7xl | px-6 py-8 |
| Fleet | ✅ | ✅ | Standard | 7xl | px-6 py-8 |
| **Pricing** | ✅ | ✅ | **Custom** | 7xl | **py-12 px-4** |
| Subscriptions | ✅ | ✅ | **Custom** | **6xl** | **p-6** |

## Recommendation

To make all pages consistent, you could:
1. Remove the custom background gradient from Pricing
2. Use standard padding (`px-6 py-8`) on all pages
3. Use consistent max-width (7xl) on all pages

Would you like me to make them all consistent?

