
The user wants to install the Google Ads tag (gtag.js with ID `AW-18104880290`) into the site for conversion measurement. This goes in `index.html` right after `<head>`.

Simple, single-file change. No clarifying questions needed.

## Plan: Install Google Ads tag

**File**: `index.html`

Add the gtag.js snippet immediately after `<head>` (before existing meta tags), as recommended by Google.

```html
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18104880290"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-18104880290');
  </script>

  <meta charset="UTF-8" />
  ...
</head>
```

**Notes**:
- The tag loads asynchronously (`async`), so it won't block rendering.
- Single tag per page — no duplicates will be added.
- Will be active on all routes (public landing, RSVP pages, app) since `index.html` is the SPA entry.
- For tracking specific conversions later (e.g., signup, checkout success), we can add `gtag('event', 'conversion', {...})` calls in the relevant React components — let me know if/when you want that.
