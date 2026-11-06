"""
Google OAuth 2.0 & Gmail API Service for Med44.
Configured for:
- Web Application Flow
- Authorized Redirect URI: http://localhost:8000/api/auth/google/callback
- Scope: https://www.googleapis.com/auth/gmail.send
- Authorized User: mayankmayank9444@gmail.com
- Demo Recipients: mayankmayank9444@gmail.com, md6074@srmist.edu.in

Security:
- Never exposes Client Secret or refresh tokens to the frontend
- Stores refresh tokens securely in SQLite database
- Performs automatic access token refresh
"""
import base64
import datetime
import logging
import urllib.parse
from email.message import EmailMessage
from typing import Optional, List, Dict, Any
import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.models import OAuthToken, NotificationLog

logger = logging.getLogger("med44.gmail")

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def get_google_authorization_url(state: str = "med44_oauth") -> str:
    """
    Constructs the consent URL for Google OAuth 2.0 Web Application.
    Requests offline access to receive a persistent refresh token.
    """
    client_id = settings.GOOGLE_CLIENT_ID or settings.GMAIL_OAUTH_CLIENT_ID or "YOUR_GOOGLE_CLIENT_ID"
    params = {
        "client_id": client_id,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": settings.GMAIL_API_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"


async def exchange_code_for_tokens(code: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Exchanges authorization code for access and refresh tokens.
    Persists tokens into the database.
    """
    client_id = settings.GOOGLE_CLIENT_ID or settings.GMAIL_OAUTH_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET or settings.GMAIL_OAUTH_CLIENT_SECRET

    if not client_id or not client_secret:
        raise ValueError("Google OAuth Client ID and Secret must be configured in settings/.env")

    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(GOOGLE_TOKEN_ENDPOINT, data=data)
        if res.status_code != 200:
            logger.error("OAuth token exchange failed: %s %s", res.status_code, res.text)
            raise RuntimeError(f"Token exchange failed with Google: {res.text}")

        token_data = res.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)
    expires_at = datetime.datetime.now() + datetime.timedelta(seconds=expires_in - 60)

    # Persist or update in database
    stmt = select(OAuthToken).where(
        OAuthToken.provider == "google",
        OAuthToken.user_email == settings.AUTHORIZED_GMAIL_USER,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()

    if existing:
        existing.access_token = access_token
        if refresh_token:
            existing.refresh_token = refresh_token
        existing.expires_at = expires_at
        existing.updated_at = datetime.datetime.now()
    else:
        new_token = OAuthToken(
            provider="google",
            user_email=settings.AUTHORIZED_GMAIL_USER,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            scope=settings.GMAIL_API_SCOPE,
            expires_at=expires_at,
        )
        db.add(new_token)

    await db.commit()
    logger.info("Successfully persisted Google OAuth tokens for %s", settings.AUTHORIZED_GMAIL_USER)
    return {"status": "SUCCESS", "user_email": settings.AUTHORIZED_GMAIL_USER}


async def get_valid_access_token(db: AsyncSession) -> Optional[str]:
    """
    Retrieves a valid access token. Refreshes if expired or near expiry.
    """
    stmt = select(OAuthToken).where(
        OAuthToken.provider == "google",
        OAuthToken.user_email == settings.AUTHORIZED_GMAIL_USER,
    )
    token_record = (await db.execute(stmt)).scalar_one_or_none()

    # Also check if refresh token was supplied via .env as a fallback
    refresh_tok = token_record.refresh_token if token_record else settings.GMAIL_OAUTH_REFRESH_TOKEN

    if not token_record and not refresh_tok:
        return None

    now = datetime.datetime.now()
    if token_record and token_record.access_token and token_record.expires_at and token_record.expires_at > now:
        return token_record.access_token

    # Token missing or expired — refresh it
    if not refresh_tok:
        return None

    client_id = settings.GOOGLE_CLIENT_ID or settings.GMAIL_OAUTH_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET or settings.GMAIL_OAUTH_CLIENT_SECRET
    if not client_id or not client_secret:
        return None

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_tok,
        "grant_type": "refresh_token",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(GOOGLE_TOKEN_ENDPOINT, data=data)
            if res.status_code == 200:
                tdata = res.json()
                new_acc = tdata.get("access_token")
                expires_in = tdata.get("expires_in", 3600)
                expires_at = now + datetime.timedelta(seconds=expires_in - 60)

                if token_record:
                    token_record.access_token = new_acc
                    token_record.expires_at = expires_at
                    token_record.updated_at = now
                else:
                    new_token = OAuthToken(
                        provider="google",
                        user_email=settings.AUTHORIZED_GMAIL_USER,
                        access_token=new_acc,
                        refresh_token=refresh_tok,
                        expires_at=expires_at,
                    )
                    db.add(new_token)
                await db.commit()
                return new_acc
    except Exception as e:
        logger.error("Failed to refresh Google access token: %s", e)

    return None


async def send_gmail_alert(
    to_emails: List[str],
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    patient_id: int = 1,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Sends an email using the Gmail REST API (users.messages.send).
    If no active credentials are found in TEST mode, safely logs as SIMULATED.
    """
    recipients = [e.strip() for e in to_emails if e.strip()]
    if not recipients:
        return {"status": "ERROR", "message": "No valid recipient email addresses"}

    # Attempt real Gmail API dispatch
    access_token = None
    if db:
        access_token = await get_valid_access_token(db)

    if access_token:
        try:
            msg = EmailMessage()
            msg.set_content(body_text)
            if body_html:
                msg.add_alternative(body_html, subtype="html")
            msg["To"] = ", ".join(recipients)
            msg["From"] = settings.AUTHORIZED_GMAIL_USER
            msg["Subject"] = subject

            raw_base64 = base64.urlsafe_b64encode(msg.as_bytes()).decode()

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    GMAIL_SEND_ENDPOINT,
                    headers=headers,
                    json={"raw": raw_base64},
                )
                if res.status_code in [200, 201]:
                    msg_id = res.json().get("id")
                    logger.info("Gmail API alert sent successfully. Message ID: %s", msg_id)
                    if db:
                        for r in recipients:
                            notif = NotificationLog(
                                patient_id=patient_id,
                                recipient_email=r,
                                recipient_role="DOCTOR",
                                notification_type="DOCTOR_ALERT",
                                subject=subject,
                                body_text=body_text,
                                status="SENT",
                            )
                            db.add(notif)
                        await db.commit()
                    return {
                        "status": "SENT",
                        "provider": "gmail_api",
                        "message_id": msg_id,
                        "recipients": recipients,
                    }
                else:
                    logger.warning("Gmail API returned error %s: %s", res.status_code, res.text)
        except Exception as e:
            logger.error("Error sending via Gmail API: %s", e)

    # Fallback / Simulated mode (when waiting for OAuth authorization)
    if db:
        for r in recipients:
            notif = NotificationLog(
                patient_id=patient_id,
                recipient_email=r,
                recipient_role="DOCTOR",
                notification_type="DOCTOR_ALERT",
                subject=subject,
                body_text=body_text,
                status="SIMULATED",
            )
            db.add(notif)
        await db.commit()

    return {
        "status": "SIMULATED",
        "provider": "gmail_api",
        "note": "Awaiting Google OAuth token or running in TEST mode. Logged to outbox.",
        "recipients": recipients,
    }


async def get_oauth_integration_status(db: AsyncSession) -> Dict[str, Any]:
    """
    Returns public OAuth configuration and connection status for the UI.
    Never exposes client secrets or tokens.
    """
    stmt = select(OAuthToken).where(
        OAuthToken.provider == "google",
        OAuthToken.user_email == settings.AUTHORIZED_GMAIL_USER,
    )
    token_record = (await db.execute(stmt)).scalar_one_or_none()
    has_token = bool(token_record and (token_record.refresh_token or token_record.access_token))
    has_env_token = bool(settings.GMAIL_OAUTH_REFRESH_TOKEN)

    client_id = settings.GOOGLE_CLIENT_ID or settings.GMAIL_OAUTH_CLIENT_ID
    is_configured = bool(client_id)

    demo_recipients = [e.strip() for e in settings.DEMO_ALERT_EMAILS.split(",") if e.strip()]

    return {
        "configured": is_configured,
        "connected": has_token or has_env_token,
        "authorized_user": settings.AUTHORIZED_GMAIL_USER,
        "scope": settings.GMAIL_API_SCOPE,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "demo_recipients": demo_recipients,
        "auth_url": get_google_authorization_url() if is_configured else None,
    }
