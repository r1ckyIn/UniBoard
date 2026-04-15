"""AWS SES email sender with async wrapper around boto3."""

from __future__ import annotations

import asyncio

import boto3
import structlog

logger = structlog.get_logger()


class SESEmailSender:
    """Send HTML emails via AWS SES with async support."""

    def __init__(self, region: str = "ap-southeast-2") -> None:
        self._client = boto3.client("ses", region_name=region)

    async def send_html_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        sender: str = "digest@uniboard.app",
        text_body: str | None = None,
    ) -> bool:
        """Send an HTML email via SES.

        Runs boto3 synchronous call in asyncio.to_thread().
        Returns True on success, False on error (never raises).

        When ``text_body`` is provided, the SES Message includes a Text body
        alongside the HTML body for recipients whose clients prefer or
        require plaintext (and for better deliverability).
        """
        body: dict[str, object] = {
            "Html": {"Data": html_body, "Charset": "utf-8"},
        }
        if text_body is not None:
            body["Text"] = {"Data": text_body, "Charset": "utf-8"}
        message = {
            "Subject": {"Data": subject, "Charset": "utf-8"},
            "Body": body,
        }
        try:
            await asyncio.to_thread(
                self._client.send_email,
                Source=sender,
                Destination={"ToAddresses": [to_email]},
                Message=message,
            )
            logger.info("email_sent", to=to_email, subject=subject)
            return True
        except Exception:
            logger.warning("email_send_failed", to=to_email, subject=subject, exc_info=True)
            return False
