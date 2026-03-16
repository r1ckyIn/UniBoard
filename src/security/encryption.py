"""AES-256-GCM encryption for API tokens stored in database."""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from src.config import get_settings


class TokenEncryption:
    """Encrypt and decrypt API tokens using AES-256-GCM.

    Each encrypt() call generates a fresh 12-byte nonce to prevent
    nonce reuse, which would compromise all encrypted data.
    """

    def __init__(self, key: bytes) -> None:
        """Initialize with a 32-byte (256-bit) encryption key."""
        if len(key) != 32:
            raise ValueError("Encryption key must be exactly 32 bytes")
        self._aesgcm = AESGCM(key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext and return base64(nonce + ciphertext)."""
        nonce = os.urandom(12)
        ciphertext = self._aesgcm.encrypt(
            nonce,
            plaintext.encode("utf-8"),
            None,
        )
        return base64.b64encode(nonce + ciphertext).decode("utf-8")

    def decrypt(self, encrypted: str) -> str:
        """Decrypt base64-encoded nonce+ciphertext and return plaintext."""
        raw = base64.b64decode(encrypted)
        nonce = raw[:12]
        ciphertext = raw[12:]
        plaintext_bytes = self._aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode("utf-8")

    def canary_check(self) -> bool:
        """Verify the encryption key works by round-tripping a canary value."""
        try:
            canary = "uniboard-canary-check"
            result = self.decrypt(self.encrypt(canary))
            return result == canary
        except Exception:
            return False


def get_encryption() -> TokenEncryption:
    """Create TokenEncryption from Settings.encryption_key.

    Supports two key formats:
    - 64-char hex string: decoded via bytes.fromhex() to 32 bytes
    - Raw string >= 32 chars: encoded and truncated to 32 bytes
    """
    key_str = get_settings().encryption_key
    if not key_str:
        raise RuntimeError("encryption_key is not configured in settings")

    if len(key_str) == 64:
        try:
            key = bytes.fromhex(key_str)
            return TokenEncryption(key)
        except ValueError:
            pass

    if len(key_str) >= 32:
        key = key_str.encode("utf-8")[:32]
        return TokenEncryption(key)

    raise RuntimeError(
        "ENCRYPTION_KEY must be either a 64-char hex string or at least 32 characters"
    )
