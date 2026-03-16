"""Integration tests for AES-256-GCM token encryption."""

import base64

import pytest
from cryptography.exceptions import InvalidTag

from src.security.encryption import TokenEncryption


def test_encrypt_decrypt_round_trip(encryption: TokenEncryption) -> None:
    """Encrypt a token, decrypt it, verify equality."""
    original = "my-secret-canvas-token/+=&special"
    encrypted = encryption.encrypt(original)
    decrypted = encryption.decrypt(encrypted)
    assert decrypted == original


def test_encrypt_produces_unique_ciphertext(encryption: TokenEncryption) -> None:
    """Same plaintext encrypted twice should produce different ciphertext (fresh nonce)."""
    plaintext = "same-token-value"
    encrypted1 = encryption.encrypt(plaintext)
    encrypted2 = encryption.encrypt(plaintext)
    assert encrypted1 != encrypted2


def test_canary_check_passes(encryption: TokenEncryption) -> None:
    """Canary check should return True with a valid key."""
    assert encryption.canary_check() is True


def test_decrypt_with_wrong_key() -> None:
    """Decrypting with a different key should raise InvalidTag."""
    key1 = b"key-one-for-encryption-test-1234"  # 32 bytes
    key2 = b"key-two-for-encryption-test-5678"  # 32 bytes
    enc1 = TokenEncryption(key1)
    enc2 = TokenEncryption(key2)

    encrypted = enc1.encrypt("secret-data")
    with pytest.raises(InvalidTag):
        enc2.decrypt(encrypted)


def test_decrypt_corrupted_data(encryption: TokenEncryption) -> None:
    """Decrypting corrupted data should raise an exception."""
    garbage = base64.b64encode(b"this-is-not-valid-ciphertext-data").decode()
    with pytest.raises(Exception):  # noqa: B017
        encryption.decrypt(garbage)


def test_key_validation() -> None:
    """Key shorter than 32 bytes should raise ValueError."""
    with pytest.raises(ValueError, match="32 bytes"):
        TokenEncryption(b"too-short")
