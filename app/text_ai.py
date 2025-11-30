import requests
import json
from typing import Dict, Any

OLLAMA_URL = "http://35.189.240.113:11434/api/generate"
MODEL_NAME = "gemma3:4b"

SYSTEM_PROMPT_ZBOT = """<HIER BOVENSTAANDE SYSTEM PROMPT INVOEGEN>"""

def ask_zbot(user_message: str, code: str = "") -> Dict[str, Any]:

    full_prompt = f"""
{SYSTEM_PROMPT_ZBOT}

USER QUESTION:
{user_message}

OPEN FILE CONTENT:
{code}

Z-BOT:
""".strip()

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                'model': MODEL_NAME,
                'prompt': full_prompt,
                'stream': False,
                'options': {
                    'temperature': 0.4,
                    'num_predict': 200,
                    'top_k': 40,
                    'top_p': 0.9
                }
            },
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            bot_response = data.get('response', '').strip()
            return {
                'success': True,
                'response': bot_response or "No response from model."
            }

        return {
            'success': False,
            'error': f"Status {response.status_code}",
            'response': f"Server returned HTTP {response.status_code}"
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'response': f"Error communicating with AI server: {e}"
        }