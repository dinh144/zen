-- Daily allowance per user: every saved card costs a model call in the cloud.
CREATE TABLE IF NOT EXISTS usage (
  user_id uuid NOT NULL,
  day     date NOT NULL DEFAULT current_date,
  cards   int  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
