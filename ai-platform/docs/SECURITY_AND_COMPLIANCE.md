# Security and Compliance Notes

- Key subscribers by stable UUID, not display name.
- Never commit secrets or API keys.
- Verify webhook HMAC signatures in production.
- Store audit logs for campaign, media, approval, and automation actions.
- Gate locked media release on `purchasedAt`.
- Keep automated chat responses under 100 words and route sensitive topics to humans.
- Track likeness consent and LoRA/reference image provenance outside generated prompts.
- Use object storage for generated media; avoid storing large binaries in the app database.
- Add your privacy, data export, and deletion workflows before production launch.

