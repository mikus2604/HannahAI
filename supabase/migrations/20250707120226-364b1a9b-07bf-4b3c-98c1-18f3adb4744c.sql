-- Create calls table to store call metadata
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_call_sid TEXT NOT NULL UNIQUE,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  call_status TEXT NOT NULL DEFAULT 'initiated',
  call_duration INTEGER,
  recording_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transcripts table to store conversation flow
CREATE TABLE public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('caller', 'agent')),
  message TEXT NOT NULL,
  intent TEXT,
  confidence DECIMAL(3,2),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_sessions table to manage dialogue state
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  current_state TEXT NOT NULL DEFAULT 'greeting',
  collected_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for Twilio webhooks)
CREATE POLICY "Allow public access to calls" ON public.calls FOR ALL USING (true);
CREATE POLICY "Allow public access to transcripts" ON public.transcripts FOR ALL USING (true);
CREATE POLICY "Allow public access to call_sessions" ON public.call_sessions FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_calls_twilio_sid ON public.calls(twilio_call_sid);
CREATE INDEX idx_calls_from_number ON public.calls(from_number);
CREATE INDEX idx_calls_started_at ON public.calls(started_at DESC);
CREATE INDEX idx_transcripts_call_id ON public.transcripts(call_id);
CREATE INDEX idx_call_sessions_call_id ON public.call_sessions(call_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON public.call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();