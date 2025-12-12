from flask import Blueprint, request, jsonify, session
from functools import wraps
import os
import requests
from datetime import datetime, timedelta

from app import db
from app.models import User

replies_bp = Blueprint('replies', __name__)

# Track rephrase requests per user to prevent quota exhaustion
rephrase_request_tracker = {}

def check_rephrase_quota(user_id, max_requests=5, window_minutes=60):
    """Check if user has exceeded rephrase request quota"""
    now = datetime.now()
    key = f"user_{user_id}"
    
    # Clean up old entries
    if key in rephrase_request_tracker:
        rephrase_request_tracker[key] = [
            req_time for req_time in rephrase_request_tracker[key]
            if now - req_time < timedelta(minutes=window_minutes)
        ]
    else:
        rephrase_request_tracker[key] = []
    
    # Check if quota exceeded
    if len(rephrase_request_tracker[key]) >= max_requests:
        return False  # Quota exceeded
    
    # Add current request
    rephrase_request_tracker[key].append(now)
    return True  # Quota available


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


def generate_local_replies(original_message, count=3):
    # Context-aware local fallback that varies based on message content
    base = original_message.strip().lower()
    
    # Generic suggestions that work for most messages
    generic = [
        "That sounds great!",
        "Thanks for letting me know.",
        "Got it, thanks!",
        "I appreciate that.",
        "Sounds good to me.",
        "Thanks for the update.",
        "I hear you.",
        "Okay, cool!",
        "That works for me.",
        "Thanks for sharing.",
    ]
    
    # Context-specific suggestions based on keywords
    suggestions = []
    
    if any(word in base for word in ['how are you', 'how are u', 'how u doing', 'whats up']):
        suggestions = ["I'm doing well, thanks!", "Great, and you?", "Pretty good, how about you?"]
    elif any(word in base for word in ['help', 'can you', 'can u', 'would you', 'could you']):
        suggestions = ["Sure, I can help.", "Of course!", "Happy to help."]
    elif any(word in base for word in ['thanks', 'thank you', 'appreciate']):
        suggestions = ["You're welcome!", "My pleasure.", "Anytime!"]
    elif any(word in base for word in ['sorry', 'my bad', 'oops']):
        suggestions = ["No problem at all.", "It's okay.", "Don't worry about it."]
    elif any(word in base for word in ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay']):
        suggestions = ["Great!", "Perfect.", "Awesome."]
    elif any(word in base for word in ['no', 'nope', 'nah']):
        suggestions = ["I understand.", "No problem.", "That's fine."]
    elif any(word in base for word in ['when', 'what time', 'what day']):
        suggestions = ["Let me check.", "I'll let you know.", "Good question."]
    elif any(word in base for word in ['love', 'awesome', 'cool', 'nice', 'great']):
        suggestions = ["Totally agree!", "Right?!", "I know, right?"]
    elif any(word in base for word in ['what', 'why', 'where']):
        suggestions = ["Good point.", "I'm not sure.", "Let me think about that."]
    
    # If no context match, use generic suggestions
    if not suggestions:
        suggestions = generic[:3]
    
    # Return requested count
    return suggestions[:count]


@replies_bp.route('/replies/suggest', methods=['POST'])
@login_required
def suggest_replies():
    try:
        data = request.get_json() or {}
        original_message = data.get('message', '')
        count = int(data.get('count', 3))

        # Validate count
        if count <= 0 or count > 6:
            count = 3

        # Try to call Gemini / Generative API if configured
        api_key = os.environ.get('GEMINI_API_KEY')
        api_url = os.environ.get('GEMINI_API_URL')

        print(f'[Replies] Message: "{original_message[:60]}..." | Count: {count}')
        print(f'[Replies] Gemini configured: Key={bool(api_key)}, URL={bool(api_url)}')

        if api_key and api_url:
            try:
                prompt = (
                    f"You are a helpful assistant that suggests short conversational replies.\n"
                    f"Provide {count} short, friendly, concise reply options (each under 12 words) to this message:\n\n"
                    f"\"{original_message}\"\n\n"
                    f"Return ONLY the replies separated by newlines, one per line. No numbering, no extra text."
                )

                # Gemini API uses key as query parameter
                gemini_url = f"{api_url}?key={api_key}"
                
                # Gemini expects 'contents' format
                payload = {
                    'contents': [
                        {'parts': [{'text': prompt}]}
                    ],
                    'generationConfig': {
                        'maxOutputTokens': 256,
                        'temperature': 0.7,
                        'topP': 0.95
                    }
                }

                headers = {'Content-Type': 'application/json'}

                print(f'[Replies] Calling Gemini API (key provided: {bool(api_key)})')
                resp = requests.post(gemini_url, headers=headers, json=payload, timeout=15)
                print(f'[Replies] Gemini response status: {resp.status_code}')
                
                if resp.status_code == 200:
                    js = resp.json()
                    print(f'[Replies] Gemini response keys: {list(js.keys())}')
                    
                    # Gemini's response: { 'candidates': [ { 'content': { 'parts': [ { 'text': ... } ] } } ] }
                    candidates = []
                    if isinstance(js, dict) and 'candidates' in js and js['candidates']:
                        for cand in js['candidates']:
                            if (
                                isinstance(cand, dict)
                                and 'content' in cand
                                and 'parts' in cand['content']
                                and isinstance(cand['content']['parts'], list)
                            ):
                                for part in cand['content']['parts']:
                                    if isinstance(part, dict) and 'text' in part:
                                        text = part['text'].strip()
                                        # Split by newlines to get individual suggestions
                                        lines = [line.strip() for line in text.split('\n') if line.strip()]
                                        candidates.extend(lines)
                    
                    if len(candidates) == 0:
                        print(f'[Replies] Could not parse Gemini response: {js}')
                        raise ValueError('No candidate replies returned from API')
                    
                    # Remove empty lines and limit to requested count
                    suggestions = [c for c in candidates if c][:count]
                    print(f'[Replies] ✓ SUCCESS: Gemini returned {len(suggestions)} suggestions')
                    print(f'[Replies] Suggestions: {suggestions}')
                    return jsonify({'suggestions': suggestions}), 200
                else:
                    print(f'[Replies] Gemini API error {resp.status_code}: {resp.text[:200]}')
                    raise Exception(f'Gemini API returned {resp.status_code}')
            except Exception as e:
                print(f'[Replies] ✗ Gemini failed: {str(e)[:100]}')
                print(f'[Replies] Falling back to local generator...')

        # Fallback to local context-aware generator
        print(f'[Replies] → Using local fallback generator for: "{original_message[:40]}..."')
        suggestions = generate_local_replies(original_message, count)
        print(f'[Replies] → Local suggestions: {suggestions}')
        return jsonify({'suggestions': suggestions}), 200
    except Exception as e:
        print(f'[Replies] Unexpected error: {e}')
        return jsonify({'error': str(e)}), 500

def generate_local_rephrase(original_message):
    """Smart local rephrase patterns for when Gemini API is unavailable"""
    words = original_message.split()
    if len(words) < 5:
        return None  # Too short to rephrase meaningfully
    
    msg_lower = original_message.lower()
    
    # Pattern 1: Convert casual to formal
    rephrases = []
    
    # Check for casual patterns and provide formal alternatives
    text = original_message.strip()
    
    # Casual -> Formal patterns
    if "gonna" in msg_lower:
        text = text.replace("gonna", "going to").replace("Gonna", "Going to")
        rephrases.append(text)
    
    if "wanna" in msg_lower:
        text = text.replace("wanna", "want to").replace("Wanna", "Want to")
        rephrases.append(text)
    
    if "kinda" in msg_lower or "kind of" in msg_lower:
        text = text.replace("kinda", "somewhat").replace("kind of", "somewhat")
        rephrases.append(text)
    
    if "gotta" in msg_lower:
        text = text.replace("gotta", "have to").replace("Gotta", "Have to")
        rephrases.append(text)
    
    # Pattern 2: Add punctuation and capitalize if missing
    if not original_message.endswith(('.', '!', '?', ',')):
        text_with_period = original_message.strip() + '.'
        if text_with_period not in rephrases:
            rephrases.append(text_with_period)
    
    # Pattern 3: Make it more concise (remove redundancy)
    if "i think that" in msg_lower:
        concise = original_message.replace("i think that ", "i think ").replace("I think that ", "I think ")
        if concise not in rephrases and concise != original_message:
            rephrases.append(concise)
    
    if "it seems like" in msg_lower:
        concise = original_message.replace("it seems like", "it seems").replace("It seems like", "It seems")
        if concise not in rephrases and concise != original_message:
            rephrases.append(concise)
    
    # Pattern 4: Make it more structured (add context words)
    if not msg_lower.startswith(('however', 'therefore', 'thus', 'moreover', 'furthermore', 'nonetheless')):
        # Check if it's a response that could benefit from transition words
        if len(words) > 10:
            structured = "Furthermore, " + original_message[0].lower() + original_message[1:]
            if structured not in rephrases:
                rephrases.append(structured)
    
    # Pattern 5: Make it more positive/constructive
    if "but" in msg_lower and "can't" in msg_lower:
        # Reframe negative statement positively
        positive = original_message.replace("can't", "could").replace("Can't", "Could")
        positive = positive.replace("won't", "will").replace("Won't", "Will")
        if positive not in rephrases and positive != original_message:
            rephrases.append(positive)
    
    # Return first valid rephrase that's different from original
    for rephrase in rephrases:
        if rephrase.strip() != original_message.strip():
            return rephrase.strip()
    
    # Fallback: simple punctuation fix
    if not original_message.endswith(('.', '!', '?')):
        return original_message.strip() + '.'
    
    return None


@replies_bp.route('/replies/rephrase', methods=['POST'])
@login_required
def rephrase_message():
    """Rephrase a long message for better clarity/professionalism"""
    try:
        # TEMPORARY: Disable rephrase feature due to API quota issues
        # Remove this block when Gemini quota is upgraded
        print(f'[Rephrase] ⚠️ Feature temporarily disabled - Gemini quota exceeded')
        return jsonify({'rephrased': None, 'error': 'Rephrase feature temporarily unavailable'}), 200
        
        data = request.get_json() or {}
        raw_message = data.get('message', '')  # Get raw message before processing
        original_message = raw_message.strip()
        user_id = session.get('user_id')

        # Log EXACTLY what was received
        print(f'[Rephrase] RECEIVED (raw): "{raw_message}"')
        print(f'[Rephrase] RECEIVED (stripped): "{original_message}"')

        if not original_message:
            return jsonify({'error': 'Message is required'}), 400

        # Only rephrase if message is longer than ~50 characters (a few sentences)
        if len(original_message) < 50:
            return jsonify({'rephrased': None, 'reason': 'Message too short to rephrase'}), 200

        # Check rephrase quota (5 requests per hour per user)
        if not check_rephrase_quota(user_id, max_requests=5, window_minutes=60):
            print(f'[Rephrase] ⚠️ User {user_id} exceeded rephrase quota (5/hour)')
            # Don't call Gemini, go straight to fallback
            print(f'[Rephrase] → Using local fallback (quota limited)')
            rephrased = generate_local_rephrase(original_message)
            if rephrased:
                return jsonify({'rephrased': rephrased, 'usingFallback': True}), 200
            else:
                return jsonify({'rephrased': None, 'usingFallback': False}), 200

        api_key = os.environ.get('GEMINI_API_KEY')
        api_url = os.environ.get('GEMINI_API_URL')

        print(f'[Rephrase] Input (Length: {len(original_message)} chars): {original_message}')
        print(f'[Rephrase] Gemini configured: Key={bool(api_key)}, URL={bool(api_url)}')

        if api_key and api_url:
            try:
                prompt = (
                    f"Fix only the grammar, punctuation, and spelling in the following message. "
                    f"Keep the original meaning, style, and tone exactly as it is. "
                    f"Make minimal changes - only fix clear errors.\n\n"
                    f"Original: {original_message}"
                )

                gemini_url = f"{api_url}?key={api_key}"
                
                payload = {
                    'contents': [
                        {'parts': [{'text': prompt}]}
                    ],
                    'generationConfig': {
                        'maxOutputTokens': 256,
                        'temperature': 0.7,
                        'topP': 0.95
                    }
                }

                headers = {'Content-Type': 'application/json'}

                print(f'[Rephrase] Calling Gemini API')
                resp = requests.post(gemini_url, headers=headers, json=payload, timeout=15)
                print(f'[Rephrase] Gemini response status: {resp.status_code}')
                
                if resp.status_code == 200:
                    js = resp.json()
                    
                    # Extract rephrased text from Gemini response
                    rephrased = None
                    if isinstance(js, dict) and 'candidates' in js and js['candidates']:
                        for cand in js['candidates']:
                            if (
                                isinstance(cand, dict)
                                and 'content' in cand
                                and 'parts' in cand['content']
                                and isinstance(cand['content']['parts'], list)
                            ):
                                for part in cand['content']['parts']:
                                    if isinstance(part, dict) and 'text' in part:
                                        rephrased = part['text'].strip()
                                        break
                    
                    if rephrased and rephrased != original_message:
                        print(f'[Rephrase] ✓ SUCCESS: Generated rephrase')
                        print(f'[Rephrase] Original: {original_message}')
                        print(f'[Rephrase] Rephrased: {rephrased}')
                        return jsonify({'rephrased': rephrased, 'usingFallback': False}), 200
                    else:
                        print(f'[Rephrase] Could not generate meaningful rephrase')
                        raise Exception('No meaningful rephrase generated')
                else:
                    print(f'[Rephrase] Gemini API error {resp.status_code}: {resp.text[:200]}')
                    raise Exception(f'Gemini API returned {resp.status_code}')
            except Exception as e:
                print(f'[Rephrase] ✗ Gemini failed: {str(e)[:100]}')
                print(f'[Rephrase] → No fallback - returning empty suggestion')
                # Don't use fallback - it produces garbage. Just return None
                return jsonify({'rephrased': None, 'usingFallback': False, 'error': 'Gemini API unavailable'}), 200

        # No local fallback - Gemini is unavailable, just return empty
        return jsonify({'rephrased': None, 'usingFallback': False}), 200

    except Exception as e:
        print(f'[Rephrase] Unexpected error: {e}')
        return jsonify({'error': str(e)}), 500