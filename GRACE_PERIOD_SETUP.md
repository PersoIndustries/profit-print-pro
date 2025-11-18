# Grace Period & Image Cleanup Setup

## Overview
This system implements a 3-month grace period when users downgrade or cancel their subscription. During this period:
- Users have **read-only access** to their data
- Users cannot create new projects, orders, or materials
- A warning alert is shown about upcoming image deletion
- After 3 months, all images are automatically deleted

## How It Works

### 1. Automatic Grace Period Activation
When a user downgrades their subscription (e.g., from Pro to Free, or Enterprise to Pro/Free):
- A database trigger automatically sets:
  - `downgrade_date`: Current timestamp
  - `previous_tier`: The tier they downgraded from
  - `grace_period_end`: Current date + 90 days
  - `is_read_only`: true

### 2. User Experience
- **Warning Alert**: Users see a prominent alert showing days remaining until deletion
- **Read-Only Mode**: Users can view but not create/modify:
  - Projects
  - Orders
  - Materials
  - Catalog items
- **Reactivation Option**: Users can upgrade back to their previous tier (or higher) to:
  - Cancel the grace period
  - Restore full access
  - Preserve all images

### 3. Automatic Cleanup
The `cleanup-grace-period-images` edge function:
- Finds users whose grace period has expired
- Deletes all images from:
  - Catalog projects (`catalog-images` bucket)
  - Projects (`project-images` bucket)
  - Brand logos (`brand-logos` bucket)
- Updates database to clear image URLs
- Resets grace period fields

## Setting Up Automatic Cleanup

### Option 1: Supabase Cron (Recommended)

1. Go to your Supabase SQL Editor
2. Enable the required extensions:
```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

3. Create the cron job:
```sql
SELECT cron.schedule(
  'cleanup-grace-period-images',
  '0 2 * * *', -- Run daily at 2 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://qjacgxvzjfjxytfggqro.supabase.co/functions/v1/cleanup-grace-period-images',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

4. Verify the cron job is running:
```sql
SELECT * FROM cron.job;
```

### Option 2: External Cron Service

If you prefer using an external service like GitHub Actions, Vercel Cron, or similar:

**Schedule**: Daily at 2 AM UTC
**Endpoint**: `POST https://qjacgxvzjfjxytfggqro.supabase.co/functions/v1/cleanup-grace-period-images`
**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI
Content-Type: application/json
```

### Manual Testing

To manually trigger the cleanup (for testing):
```bash
curl -X POST \
  'https://qjacgxvzjfjxytfggqro.supabase.co/functions/v1/cleanup-grace-period-images' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYWNneHZ6amZqeHl0ZmdncXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODI5MDIsImV4cCI6MjA3Nzk1ODkwMn0.sQ9bJcFERX57OhAgFC3-iwegAA18yqI6J8juEakEKjI' \
  -H 'Content-Type: application/json'
```

## Monitoring

### View Logs
Check the edge function logs in the Supabase dashboard:
- Navigate to Edge Functions > cleanup-grace-period-images > Logs
- Look for successful cleanup operations and any errors

### Check Grace Period Status
Query users in grace period:
```sql
SELECT 
  u.email,
  s.tier,
  s.previous_tier,
  s.downgrade_date,
  s.grace_period_end,
  s.is_read_only,
  EXTRACT(day FROM (s.grace_period_end - NOW())) as days_remaining
FROM user_subscriptions s
JOIN profiles u ON u.id = s.user_id
WHERE s.grace_period_end IS NOT NULL
  AND s.grace_period_end > NOW()
ORDER BY s.grace_period_end ASC;
```

## Database Schema

The following fields were added to `user_subscriptions`:
- `downgrade_date` - When the user downgraded
- `previous_tier` - What tier they had before downgrading
- `grace_period_end` - When images will be deleted (3 months after downgrade)
- `is_read_only` - Flag for read-only mode

## Important Notes

1. **Reactivation**: If a user upgrades back to their previous tier or higher, the grace period is automatically cancelled
2. **Image Preservation**: Only images in storage buckets are deleted. All other data (orders, projects metadata, etc.) is preserved
3. **Reversible**: The system only affects images, not data. Users can always reactivate and re-upload images
4. **Warning Period**: Users receive warnings when:
   - 90 days remaining (initial downgrade)
   - 30 days remaining
   - 7 days remaining (critical warning)
   - 1 day remaining (final warning)
