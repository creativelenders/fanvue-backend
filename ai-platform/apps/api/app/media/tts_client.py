import os
from typing import Optional

import httpx


class TTSGatewayClient:
    def __init__(self):
        # Point to OmniRoute audio routing endpoint or direct TTS provider
        self.tts_url = os.getenv("OMNIROUTE_TTS_URL", "http://localhost:20128/v1/audio/speech")
        self.api_key = os.getenv("OMNIROUTE_API_KEY", "")

    async def generate_voice_note(self, script_text: str, voice_id: str) -> Optional[str]:
        """Synthesizes text into an MP3 audio file and returns the hosted asset URL."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "tts-1-hd",
            "input": script_text,
            "voice": voice_id,
            "response_format": "mp3",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.tts_url, json=payload, headers=headers, timeout=15.0)
                if response.status_code == 200:
                    # In production: save bytes to AWS S3 / Cloudflare R2 and return public URL
                    audio_url = f"https://cdn.fanvue-platform.local/audio/vn_{hash(script_text)}.mp3"
                    print(f"[TTS Synthesized] Generated audio asset: {audio_url}")
                    return audio_url
            except Exception as e:
                print(f"[TTS Gateway Error] Voice note rendering failed: {str(e)}")
        return None


tts_gateway = TTSGatewayClient()
