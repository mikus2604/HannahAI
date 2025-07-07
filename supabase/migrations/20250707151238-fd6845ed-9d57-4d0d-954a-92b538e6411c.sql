-- Insert dummy calls with various statuses and time periods
INSERT INTO public.calls (twilio_call_sid, from_number, to_number, call_status, started_at, ended_at, call_duration, recording_url) VALUES
-- Recent calls (today and yesterday)
('CA1234567890abcdef1234567890abcdef', '+15551234567', '+15559876543', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes', 180, 'https://example.com/recording1.mp3'),
('CA2234567890abcdef1234567890abcdef', '+15552345678', '+15559876543', 'in-progress', NOW() - INTERVAL '15 minutes', NULL, NULL, NULL),
('CA3234567890abcdef1234567890abcdef', '+15553456789', '+15559876543', 'completed', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours' + INTERVAL '5 minutes', 300, 'https://example.com/recording2.mp3'),
('CA4234567890abcdef1234567890abcdef', '+15554567890', '+15559876543', 'failed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '30 seconds', 30, NULL),
('CA5234567890abcdef1234567890abcdef', '+15555678901', '+15559876543', 'sms_completed', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours' + INTERVAL '2 minutes', 120, NULL),

-- Yesterday's calls
('CA6234567890abcdef1234567890abcdef', '+15556789012', '+15559876543', 'completed', NOW() - INTERVAL '1 day' - INTERVAL '2 hours', NOW() - INTERVAL '1 day' - INTERVAL '2 hours' + INTERVAL '4 minutes', 240, 'https://example.com/recording3.mp3'),
('CA7234567890abcdef1234567890abcdef', '+15557890123', '+15559876543', 'partial_completed', NOW() - INTERVAL '1 day' - INTERVAL '4 hours', NOW() - INTERVAL '1 day' - INTERVAL '4 hours' + INTERVAL '2 minutes', 120, 'https://example.com/recording4.mp3'),
('CA8234567890abcdef1234567890abcdef', '+15558901234', '+15559876543', 'cancelled', NOW() - INTERVAL '1 day' - INTERVAL '6 hours', NOW() - INTERVAL '1 day' - INTERVAL '6 hours' + INTERVAL '1 minute', 60, NULL),

-- Older calls (past week)
('CA9234567890abcdef1234567890abcdef', '+15559012345', '+15559876543', 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '6 minutes', 360, 'https://example.com/recording5.mp3'),
('CA0234567890abcdef1234567890abcdef', '+15550123456', '+15559876543', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes', 180, 'https://example.com/recording6.mp3'),
('CA1134567890abcdef1234567890abcdef', '+15551123456', '+15559876543', 'failed', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '45 seconds', 45, NULL),

-- Older calls (past month)
('CA1234567890abcdef1234567890abcde1', '+15552234567', '+15559876543', 'completed', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks' + INTERVAL '5 minutes', 300, 'https://example.com/recording7.mp3'),
('CA1234567890abcdef1234567890abcde2', '+15553345678', '+15559876543', 'partial_completed', NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks' + INTERVAL '3 minutes', 180, 'https://example.com/recording8.mp3'),

-- Very old calls (past quarter)
('CA1234567890abcdef1234567890abcde3', '+15554456789', '+15559876543', 'completed', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months' + INTERVAL '4 minutes', 240, 'https://example.com/recording9.mp3'),
('CA1234567890abcdef1234567890abcde4', '+15555567890', '+15559876543', 'completed', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '7 minutes', 420, 'https://example.com/recording10.mp3');

-- Insert call sessions for completed calls
INSERT INTO public.call_sessions (call_id, current_state, collected_data, context) 
SELECT 
    c.id,
    CASE 
        WHEN c.call_status = 'completed' THEN 'completed'
        WHEN c.call_status = 'in-progress' THEN 'greeting'
        WHEN c.call_status = 'partial_completed' THEN 'information_gathering'
        ELSE 'failed'
    END,
    CASE 
        WHEN c.call_status IN ('completed', 'partial_completed') THEN 
            jsonb_build_object(
                'contact_info', jsonb_build_object(
                    'name', 'John Doe',
                    'email', 'john.doe@example.com',
                    'reason', 'General inquiry'
                ),
                'appointment_scheduled', c.call_status = 'completed',
                'follow_up_required', c.call_status = 'partial_completed'
            )
        ELSE '{}'::jsonb
    END,
    jsonb_build_object(
        'caller_mood', 'friendly',
        'call_priority', 'normal',
        'previous_calls', 0
    )
FROM public.calls c;

-- Insert realistic transcripts for the calls
INSERT INTO public.transcripts (call_id, speaker, message, confidence, intent) 
SELECT 
    c.id,
    'assistant',
    'Hello! Thank you for calling. How can I help you today?',
    0.95,
    'greeting'
FROM public.calls c
WHERE c.call_status NOT IN ('failed', 'cancelled')

UNION ALL

SELECT 
    c.id,
    'user',
    'Hi, I''d like to schedule an appointment for next week.',
    0.92,
    'appointment_request'
FROM public.calls c
WHERE c.call_status = 'completed'

UNION ALL

SELECT 
    c.id,
    'assistant',
    'I''d be happy to help you schedule an appointment. May I have your name and preferred date?',
    0.96,
    'information_request'
FROM public.calls c
WHERE c.call_status = 'completed'

UNION ALL

SELECT 
    c.id,
    'user',
    'My name is John Doe, and I''m available Tuesday or Wednesday afternoon.',
    0.94,
    'information_provided'
FROM public.calls c
WHERE c.call_status = 'completed'

UNION ALL

SELECT 
    c.id,
    'assistant',
    'Perfect! I have you scheduled for Tuesday at 2 PM. Is there anything else I can help you with?',
    0.97,
    'confirmation'
FROM public.calls c
WHERE c.call_status = 'completed'

UNION ALL

SELECT 
    c.id,
    'user',
    'That''s great, thank you so much!',
    0.93,
    'gratitude'
FROM public.calls c
WHERE c.call_status = 'completed'

UNION ALL

-- Add partial conversation for partial_completed calls
SELECT 
    c.id,
    'user',
    'Hello, I need some information about your services.',
    0.91,
    'inquiry'
FROM public.calls c
WHERE c.call_status = 'partial_completed'

UNION ALL

SELECT 
    c.id,
    'assistant',
    'I''d be happy to help. What specific information are you looking for?',
    0.95,
    'information_request'
FROM public.calls c
WHERE c.call_status = 'partial_completed'

UNION ALL

SELECT 
    c.id,
    'user',
    'I need to think about it. Can you call me back later?',
    0.89,
    'callback_request'
FROM public.calls c
WHERE c.call_status = 'partial_completed'

UNION ALL

-- Add conversation for in-progress call
SELECT 
    c.id,
    'user',
    'Hi, I''m calling about the appointment I scheduled.',
    0.90,
    'appointment_inquiry'
FROM public.calls c
WHERE c.call_status = 'in-progress'

UNION ALL

SELECT 
    c.id,
    'assistant',
    'Of course! Let me look that up for you. Can you provide your name or phone number?',
    0.96,
    'information_request'
FROM public.calls c
WHERE c.call_status = 'in-progress'

UNION ALL

-- Add SMS conversation
SELECT 
    c.id,
    'assistant',
    'Thank you for your message. We''ve received your inquiry and will respond shortly.',
    0.98,
    'sms_acknowledgment'
FROM public.calls c
WHERE c.call_status = 'sms_completed'

UNION ALL

SELECT 
    c.id,
    'user',
    'Great, looking forward to hearing from you!',
    0.95,
    'sms_response'
FROM public.calls c
WHERE c.call_status = 'sms_completed';