-- Schema for Chat with a Billionaire app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE plan_type AS ENUM ('free', 'monthly', 'annual');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  plan plan_type NOT NULL DEFAULT 'free',
  credits_left INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  description TEXT NOT NULL,
  expertise TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan plan_type NOT NULL CHECK (plan != 'free'),
  status subscription_status NOT NULL DEFAULT 'active',
  payment_id TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Pitch evaluations table
CREATE TABLE IF NOT EXISTS pitch_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id),
  pitch_text TEXT NOT NULL,
  evaluation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pitch_evaluations_user_id ON pitch_evaluations(user_id);

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
CREATE POLICY users_select_own ON users 
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY users_update_own ON users 
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for personas
-- Everyone can select personas
CREATE POLICY personas_select_all ON personas 
  FOR SELECT USING (true);
  
-- Only admins can insert/update personas
CREATE POLICY personas_admin_all ON personas 
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%admin%'
  ));

-- RLS policies for conversations
CREATE POLICY conversations_select_own ON conversations 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY conversations_insert_own ON conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY conversations_update_own ON conversations 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY conversations_delete_own ON conversations 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for messages
CREATE POLICY messages_select_own ON messages 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY messages_insert_own ON messages 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for subscriptions
CREATE POLICY subscriptions_select_own ON subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for pitch evaluations
CREATE POLICY pitch_evaluations_select_own ON pitch_evaluations 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY pitch_evaluations_insert_own ON pitch_evaluations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
