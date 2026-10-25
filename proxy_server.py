#!/usr/bin/env python3
"""
OpenAI API Proxy Server

Usage:
    python proxy_server.py [--port PORT] [--host HOST]
"""

import os
import argparse
import hmac
import time
import asyncio
import httpx
from quart import Quart, request
from quart_cors import cors
import logging
import dotenv

dotenv.load_dotenv()

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security
CORS_ALLOW_ORIGIN = os.getenv("CORS_ALLOW_ORIGIN", "*")
PROXY_TOKEN = os.getenv("PROXY_TOKEN")
if not PROXY_TOKEN:
    logger.warning("PROXY_TOKEN not found in environment variables")
    logger.warning("Refusing to start without a proxy token")
    exit()

# The proxy token ships in the public web client, so it cannot be relied on to
# keep the proxy private. Requests are rebuilt from an allowlist instead, so the
# proxy can only be used for the small chat completions the app makes.
ALLOWED_MODELS = set(
    m.strip() for m in os.getenv("OPENAI_ALLOWED_MODELS", "gpt-4o-mini").split(",") if m.strip()
)
MAX_TOKENS_LIMIT = int(os.getenv("OPENAI_MAX_TOKENS", "200"))
MAX_MESSAGES = 10
MAX_MESSAGE_CHARS = 8000
ALLOWED_ROLES = {"system", "user", "assistant"}

# API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found in environment variables")
    logger.warning("Proxy server will not work without an API key")
    exit()

# Rate limiting
request_timestamps = []
MAX_REQUESTS_PER_MINUTE = int(os.getenv("OPENAI_RATE_LIMIT", "60"))

# Create Quart app
app = Quart(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
app = cors(app, allow_origin=CORS_ALLOW_ORIGIN)


def is_authorized():
    """Check the request's proxy token in constant time"""
    token = request.headers.get("X-API-Token", "")
    return hmac.compare_digest(token.encode(), PROXY_TOKEN.encode())


def build_openai_payload(data):
    """Rebuild a client request from allowed fields only, or return None if invalid"""
    if not isinstance(data, dict):
        return None

    model = data.get("model")
    if model not in ALLOWED_MODELS:
        return None

    messages = data.get("messages")
    if not isinstance(messages, list) or not 0 < len(messages) <= MAX_MESSAGES:
        return None
    clean_messages = []
    for message in messages:
        if not isinstance(message, dict):
            return None
        role = message.get("role")
        content = message.get("content")
        if role not in ALLOWED_ROLES or not isinstance(content, str):
            return None
        if len(content) > MAX_MESSAGE_CHARS:
            return None
        clean_messages.append({"role": role, "content": content})

    max_tokens = data.get("max_tokens", MAX_TOKENS_LIMIT)
    if not isinstance(max_tokens, int) or isinstance(max_tokens, bool):
        return None
    max_tokens = max(1, min(max_tokens, MAX_TOKENS_LIMIT))

    temperature = data.get("temperature", 1.0)
    if not isinstance(temperature, (int, float)) or isinstance(temperature, bool):
        return None
    temperature = max(0.0, min(float(temperature), 2.0))

    return {
        "model": model,
        "messages": clean_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }


def check_rate_limit():
    """Check if we're exceeding the rate limit"""
    global request_timestamps

    current_time = time.time()
    # Remove timestamps older than 1 minute
    request_timestamps = [ts for ts in request_timestamps if current_time - ts < 60]

    # Check if we've exceeded the rate limit
    if len(request_timestamps) >= MAX_REQUESTS_PER_MINUTE:
        return False

    # Add current timestamp
    request_timestamps.append(current_time)
    return True


@app.route("/ping", methods=["GET"])
async def ping():
    """Ping endpoint for monitoring"""
    logger.info("Ping received")
    return {"status": "ok"}, 200


@app.route("/api/openai", methods=["POST"])
async def proxy_openai():
    if not is_authorized():
        return "Unauthorized", 401

    # Check rate limit
    if not check_rate_limit():
        logger.warning("Rate limit exceeded")
        return "Rate limit exceeded. Please try again later.", 429

    # Get request data
    data = await request.get_json(silent=True)
    payload = build_openai_payload(data)
    if payload is None:
        logger.warning("Rejected invalid OpenAI request payload")
        return "Invalid request", 400
    client_ip = request.remote_addr

    # Log the request
    logger.info(f"Request from {client_ip} - Model: {payload['model']}")

    # Forward request to OpenAI asynchronously
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                },
                json=payload,
                timeout=10,
            )

        # Log the response status
        logger.info(
            f"OpenAI API response: {response.status_code} - Message: {response.json().get('choices', [{}])[0].get('message', {}).get('content', 'unknown')}"
        )
        return response.json(), response.status_code

    except httpx.TimeoutException:
        logger.error("Request to OpenAI API timed out")
        return "Request to OpenAI API timed out", 504

    except httpx.RequestError as e:
        logger.error(f"Error forwarding request to OpenAI: {str(e)}")
        return "Error forwarding request to OpenAI", 502

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return "Internal server error", 500


def main():
    """Run the proxy server"""
    parser = argparse.ArgumentParser(
        description="OpenAI API Proxy Server"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", 10000)),
        help="Port to run the server on",
    )
    parser.add_argument(
        "--host", type=str, default="0.0.0.0", help="Host to run the server on"
    )
    args = parser.parse_args()

    logger.info(f"Starting async OpenAI proxy server on {args.host}:{args.port}")
    logger.info(
        "Use this server to avoid CORS issues when making OpenAI API calls from the web version"
    )
    logger.info(f"CORS configured with allow_origin: {CORS_ALLOW_ORIGIN}")
    logger.info(f"Rate limit configured: {MAX_REQUESTS_PER_MINUTE} requests per minute")
    logger.info(f"Proxy endpoint: http://{args.host}:{args.port}/api/openai")
    logger.info(f"Ping endpoint: http://{args.host}:{args.port}/ping")

    # Run the Quart app with hypercorn
    import hypercorn.asyncio
    from hypercorn.config import Config

    config = Config()
    config.bind = [f"{args.host}:{args.port}"]
    asyncio.run(hypercorn.asyncio.serve(app, config))


if __name__ == "__main__":
    main()