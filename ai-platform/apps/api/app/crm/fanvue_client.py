from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


@dataclass
class FanvueToken:
    access_token: str
    token_type: str = "Bearer"
    expires_in: int | None = None


class FanvueClient:
    """Thin API client. Configure base URL and paths from official Fanvue app settings."""

    def __init__(
        self,
        base_url: str,
        client_id: str,
        client_secret: str,
        oauth_token_path: str,
        messages_path: str,
        timeout: float = 20.0,
    ):
        if not base_url:
            raise ValueError("FANVUE_API_BASE_URL is required")
        if not oauth_token_path or not messages_path:
            raise ValueError("Fanvue OAuth token and messages paths must be configured from official API settings")
        self.base_url = base_url.rstrip("/")
        self.oauth_token_path = "/" + oauth_token_path.strip("/")
        self.messages_path = "/" + messages_path.strip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._token: FanvueToken | None = None

    async def oauth_client_credentials(self) -> FanvueToken:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}{self.oauth_token_path}",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()
        self._token = FanvueToken(access_token=data["access_token"], token_type=data.get("token_type", "Bearer"), expires_in=data.get("expires_in"))
        return self._token

    async def send_message(self, subscriber_uuid: str, text: str, media: list[dict[str, Any]] | None = None, ppv_price_usd: float | None = None) -> dict[str, Any]:
        token = self._token or await self.oauth_client_credentials()
        payload: dict[str, Any] = {"subscriberUuid": subscriber_uuid, "text": text, "media": media or []}
        if ppv_price_usd is not None:
            payload["ppvPriceUsd"] = ppv_price_usd
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}{self.messages_path}",
                headers={"Authorization": f"{token.token_type} {token.access_token}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()
