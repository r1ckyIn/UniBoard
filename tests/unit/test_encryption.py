"""Tests for AES-256-GCM token encryption round-trip."""

import os

import cryptography.exceptions
import pytest

from src.security.encryption import TokenEncryption


def test_encrypt_decrypt_roundtrip() -> None:
    key = os.urandom(32)
    enc = TokenEncryption(key)
    plaintext = "canvas-api-token-12345"
    encrypted = enc.encrypt(plaintext)
    assert encrypted != plaintext
    assert enc.decrypt(encrypted) == plaintext


def test_wrong_key_fails() -> None:
    key1 = os.urandom(32)
    key2 = os.urandom(32)
    enc1 = TokenEncryption(key1)
    enc2 = TokenEncryption(key2)
    encrypted = enc1.encrypt("secret-token")
    with pytest.raises(cryptography.exceptions.InvalidTag):
        enc2.decrypt(encrypted)


def test_canary_check() -> None:
    key = os.urandom(32)
    enc = TokenEncryption(key)
    assert enc.canary_check() is True
