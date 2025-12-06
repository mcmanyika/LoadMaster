-- Create marketing_ads table to store the 12 weekly ad variations
CREATE TABLE IF NOT EXISTS marketing_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketing_posts table to track posting history
CREATE TABLE IF NOT EXISTS marketing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES marketing_ads(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT DEFAULT 'whatsapp',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make ad_id nullable (allow posts without specific ad)
ALTER TABLE marketing_posts 
ALTER COLUMN ad_id DROP NOT NULL;

-- Create marketing_metrics table to track performance
CREATE TABLE IF NOT EXISTS marketing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES marketing_posts(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('response', 'call_scheduled', 'demo_scheduled', 'conversion', 'not_interested')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketing_posts_ad_id ON marketing_posts(ad_id);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_posted_at ON marketing_posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_post_id ON marketing_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_type ON marketing_metrics(metric_type);

-- Enable RLS
ALTER TABLE marketing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only specific email can access marketing data
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Specific user can view marketing ads" ON marketing_ads;
DROP POLICY IF EXISTS "Owners can view marketing ads" ON marketing_ads;
DROP POLICY IF EXISTS "Specific user can insert marketing ads" ON marketing_ads;
DROP POLICY IF EXISTS "Owners can insert marketing ads" ON marketing_ads;
DROP POLICY IF EXISTS "Specific user can update marketing ads" ON marketing_ads;
DROP POLICY IF EXISTS "Owners can update marketing ads" ON marketing_ads;
DROP POLICY IF EXISTS "Specific user can view marketing posts" ON marketing_posts;
DROP POLICY IF EXISTS "Owners can view marketing posts" ON marketing_posts;
DROP POLICY IF EXISTS "Specific user can create marketing posts" ON marketing_posts;
DROP POLICY IF EXISTS "Owners can create marketing posts" ON marketing_posts;
DROP POLICY IF EXISTS "Specific user can view marketing metrics" ON marketing_metrics;
DROP POLICY IF EXISTS "Owners can view marketing metrics" ON marketing_metrics;
DROP POLICY IF EXISTS "Specific user can create marketing metrics" ON marketing_metrics;
DROP POLICY IF EXISTS "Owners can create marketing metrics" ON marketing_metrics;
DROP POLICY IF EXISTS "Specific user can update marketing metrics" ON marketing_metrics;
DROP POLICY IF EXISTS "Owners can update marketing metrics" ON marketing_metrics;

CREATE POLICY "Any authenticated user can view marketing ads"
  ON marketing_ads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Specific user can insert marketing ads"
  ON marketing_ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'partsonmanyika@gmail.com'
    )
  );

CREATE POLICY "Specific user can update marketing ads"
  ON marketing_ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'partsonmanyika@gmail.com'
    )
  );

CREATE POLICY "Any authenticated user can view marketing posts"
  ON marketing_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Any authenticated user can create marketing posts"
  ON marketing_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Any authenticated user can view marketing metrics"
  ON marketing_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Any authenticated user can create marketing metrics"
  ON marketing_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Any authenticated user can update marketing metrics"
  ON marketing_metrics FOR UPDATE
  TO authenticated
  USING (true);

-- Insert the 12 weekly ad variations
INSERT INTO marketing_ads (week_number, title, content) VALUES
(1, 'Pain Point Focus', 'Still using Excel to manage your trucking business?

Tired of manual calculations for driver pay, dispatch fees, and fuel expenses?

LoadMaster automates everything - from Rate Confirmations to financial tracking.

Stop wasting time on spreadsheets. Start managing smarter.

Call us: 469-473-8724
Schedule a meeting today!'),
(2, 'Solution Focus', 'Excel spreadsheets are holding your trucking business back.

LoadMaster is the modern solution designed for trucking owners who want to scale.

Track loads, manage finances, calculate payouts - all in one place.

Ready to upgrade your workflow?

Contact us: 469-473-8724
Let''s discuss how we can help.'),
(3, 'Feature Highlight', 'What if you could:
• Store Rate Confirmations digitally (no more lost PDFs)
• Automatically calculate driver and dispatcher pay
• Track all loads in one dashboard
• Access your data anywhere, anytime

LoadMaster makes this possible.

Call: 469-473-8724
Schedule a demo today!'),
(4, 'Time Savings', 'How many hours do you spend each week on Excel spreadsheets?

LoadMaster gives you that time back.

Automated calculations. Digital document storage. Real-time tracking.

Focus on growing your business, not managing spreadsheets.

Get started: 469-473-8724'),
(5, 'Problem-Solution', 'The Problem: Excel spreadsheets for trucking management
• Easy to make calculation errors
• Hard to track multiple loads
• Rate Confirmations get lost
• Time-consuming manual work

The Solution: LoadMaster
A complete management system built for trucking businesses.

Call us: 469-473-8724'),
(6, 'Direct Question', 'Are you a trucking business owner still using Excel?

If you''re tracking loads, expenses, and payouts in spreadsheets, we have a better solution.

LoadMaster is designed specifically for modern trucking operations.

Let''s talk about how we can streamline your workflow.

Contact: 469-473-8724'),
(7, 'Benefits Focus', 'Why LoadMaster?

✓ Digital Rate Confirmation storage
✓ Automated financial calculations
✓ Real-time load tracking
✓ Fleet management dashboard
✓ Dispatcher fee tracking
✓ Driver pay calculations

All in one modern platform.

Call: 469-473-8724
Schedule a meeting!'),
(8, 'Comparison', 'Excel vs LoadMaster

Excel:
• Manual calculations
• Risk of errors
• Hard to organize
• Time-consuming

LoadMaster:
• Automated calculations
• Error-free tracking
• Organized dashboard
• Saves time

Which would you choose?

Call us: 469-473-8724'),
(9, 'Story Angle', 'Many trucking owners start with Excel.

It works at first, but as your business grows, spreadsheets become a bottleneck.

LoadMaster is designed to grow with you - from 1 truck to a full fleet.

Ready to make the switch?

Contact: 469-473-8724'),
(10, 'Efficiency Focus', 'Stop doing manual work that software can do for you.

LoadMaster handles:
• Rate Confirmation storage
• Financial calculations
• Load tracking
• Fleet management

You handle growing your business.

Call: 469-473-8724
Schedule a demo!'),
(11, 'Value Proposition', 'Trucking management shouldn''t be complicated.

LoadMaster simplifies everything:
• Store all Rate Confirmations in one place
• Automatically calculate payouts
• Track every load from start to finish
• Access your data on any device

Built for trucking owners, by people who understand your needs.

Contact: 469-473-8724'),
(12, 'Call to Action Focus', 'Ready to modernize your trucking business?

LoadMaster replaces Excel spreadsheets with a complete management system.

Schedule a meeting with us and we''ll show you how it works.

No commitment, just a conversation about how we can help.

Call: 469-473-8724
Let''s talk!')
ON CONFLICT (week_number) DO NOTHING;

