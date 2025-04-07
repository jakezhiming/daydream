from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt # Use carefully, ensure frontend sends CSRF token for real POSTs
import json
import logging

from .utils import get_llm_response # Import the helper function

logger = logging.getLogger(__name__)

# Serve the main HTML page
def index(request):
    """Renders the main single-page application interface."""
    return render(request, 'ideation/index.html')

@require_http_methods(["POST"])
# Consider csrf_protect if using forms or need stronger CSRF protection.
# For stateless APIs called via JS Fetch, ensuring correct Content-Type
# and potentially custom headers can be alternatives. For simplicity here,
# we use csrf_exempt but understand the implications.
@csrf_exempt
def api_expand_prompt(request):
    """
    API endpoint to get the next set of AI-generated prompts.
    Expects JSON payload: {'history': ['prompt1', 'prompt2', ...]}
    """
    try:
        data = json.loads(request.body)
        prompt_history = data.get('history', [])

        if not prompt_history:
            return JsonResponse({'status': 'error', 'message': 'Prompt history cannot be empty.'}, status=400)

        # Get response from LLM utility function
        result = get_llm_response(prompt_history, task_type='expand')

        if result['status'] == 'success':
            return JsonResponse({'status': 'success', 'options': result['data']})
        else:
            # Log the error details if not already logged by the util function
            logger.error(f"LLM expansion failed: {result.get('message', 'Unknown error')}")
            return JsonResponse(result, status=500) # Internal Server Error or specific error from LLM

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON format in request body.'}, status=400)
    except Exception as e:
        logger.exception("Error in api_expand_prompt view.") # Log the full traceback
        return JsonResponse({'status': 'error', 'message': f'An unexpected server error occurred: {e}'}, status=500)

@require_http_methods(["POST"])
@csrf_exempt # See note above
def api_complete_dream(request):
    """
    API endpoint to generate the final summary 'dream'.
    Expects JSON payload: {'history': ['prompt1', 'prompt2', ...]}
    """
    try:
        data = json.loads(request.body)
        prompt_history = data.get('history', [])

        if not prompt_history:
            return JsonResponse({'status': 'error', 'message': 'Prompt history cannot be empty for completion.'}, status=400)

        # Get response from LLM utility function
        result = get_llm_response(prompt_history, task_type='complete')

        if result['status'] == 'success':
            return JsonResponse({'status': 'success', 'summary': result['data']})
        else:
            logger.error(f"LLM completion failed: {result.get('message', 'Unknown error')}")
            return JsonResponse(result, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON format in request body.'}, status=400)
    except Exception as e:
        logger.exception("Error in api_complete_dream view.")
        return JsonResponse({'status': 'error', 'message': f'An unexpected server error occurred: {e}'}, status=500)