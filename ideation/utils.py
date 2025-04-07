import requests
import json
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_llm_response(prompt_history, task_type='expand'):
    """
    Calls the external LLM API to get expansions or a summary.

    Args:
        prompt_history (list): A list of strings representing the chosen prompts so far.
        task_type (str): 'expand' or 'complete'.

    Returns:
        dict: A dictionary containing the LLM's response or an error.
              Expected format for success:
              {'status': 'success', 'data': list_of_options} for 'expand'
              {'status': 'success', 'data': summary_string} for 'complete'
              Expected format for error:
              {'status': 'error', 'message': 'Error description'}
    """
    api_key = settings.LLM_API_KEY
    api_endpoint = settings.LLM_API_ENDPOINT
    model = settings.LLM_MODEL

    if not api_key:
        logger.error("LLM_API_KEY not configured in settings.")
        return {'status': 'error', 'message': 'LLM API key not configured.'}

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    # Construct the prompt for the LLM
    prompt_history = [prompt.replace("...", "") for prompt in prompt_history]
    full_prompt_text = " ".join(prompt_history)
    system_message = ""
    user_message = ""

    if task_type == 'expand':
        system_message = ("You are a creative assistant helping a user expand their thoughts. "
                          "Given the preceding idea fragments, generate exactly 5 very short, simple, distinct and creative continuation prompts. "
                          "Provide *only* the 5 prompts, each on a new line, without any numbering, bullets, or introductory text.")
        user_message = f"Continue this thought sequence:\n---\n{full_prompt_text}\n---"

    elif task_type == 'complete':
        system_message = ("You are a summarization assistant. Synthesize the following sequence of thoughts "
                          "into a single, coherent paragraph representing the final 'daydream' or concept. "
                          "Capture the essence of the journey.")
        user_message = f"Summarize this ideation sequence:\n---\n{full_prompt_text}\n---"

    else:
        return {'status': 'error', 'message': 'Invalid task type specified.'}

    # --- Payload specific to OpenAI ChatCompletion format ---
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": 200,
        "temperature": 0.8,
    }
    # --- End OpenAI specific payload ---

    try:
        response = requests.post(api_endpoint, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        response_data = response.json()

        # --- Parsing specific to OpenAI ChatCompletion format ---
        # Adapt this parsing logic based on your LLM provider's response structure
        if 'choices' not in response_data or not response_data['choices']:
             raise ValueError("LLM response did not contain 'choices'.")

        generated_text = response_data['choices'][0]['message']['content'].strip()
        # --- End OpenAI specific parsing ---

        if task_type == 'expand':
            # Split the response into lines and clean them up
            options = [opt.strip() for opt in generated_text.split('\n') if opt.strip()]

            # Ensure exactly 5 options, pad or truncate if necessary (though the prompt requested exactly 5)
            if len(options) < 5:
                options.extend(["...", "..."] * (5 - len(options))) # Simple padding
            options = options[:5]
            return {'status': 'success', 'data': options}
        else: # complete
             return {'status': 'success', 'data': generated_text}

    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling LLM API: {e}")
        if e.response is not None:
             logger.error(f"LLM API Response Status: {e.response.status_code}")
             logger.error(f"LLM API Response Body: {e.response.text}")
             return {'status': 'error', 'message': f'API request failed: {e.response.status_code} - {e.response.reason}'}
        else:
            return {'status': 'error', 'message': f'Network error or connection issue: {e}'}
    except (json.JSONDecodeError, KeyError, ValueError) as e:
         logger.error(f"Error parsing LLM response: {e}")
         return {'status': 'error', 'message': f'Failed to parse LLM response: {e}'}
    except Exception as e:
        logger.exception("An unexpected error occurred during LLM interaction.") # Logs traceback
        return {'status': 'error', 'message': f'An unexpected error occurred: {e}'}