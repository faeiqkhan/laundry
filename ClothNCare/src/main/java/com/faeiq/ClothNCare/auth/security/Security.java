package com.faeiq.ClothNCare.auth.security;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.*;
import java.security.spec.KeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Security utilities for JWT key management, password-based key derivation,
 * and private key encryption/decryption.
 */
public class Security {

    /**
     * Generate cryptographically secure random salt (16 bytes)
     */
    public static byte[] generateSalt() {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return salt;
    }

    /**
     * Derive a SecretKey from a password using PBKDF2WithHmacSHA256
     */
    public static SecretKey deriveKey(String password, byte[] salt) throws Exception {
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 65536, 256);
        SecretKey tmp = factory.generateSecret(spec);
        return new SecretKeySpec(tmp.getEncoded(), "AES");
    }

    /**
     * Encrypt a private key using password-derived AES key
     */
    public static String encryptPrivateKey(PrivateKey privateKey, String password, byte[] salt) throws Exception {
        SecretKey aesKey = deriveKey(password, salt);
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.ENCRYPT_MODE, aesKey);
        byte[] encrypted = cipher.doFinal(privateKey.getEncoded());
        return Base64.getEncoder().encodeToString(encrypted);
    }

    /**
     * Decrypt a private key using password-derived AES key
     */
    public static PrivateKey decryptPrivateKey(String encryptedKey, String password, byte[] salt) throws Exception {
        SecretKey aesKey = deriveKey(password, salt);
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.DECRYPT_MODE, aesKey);
        byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedKey));
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decrypted);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePrivate(keySpec);
    }

    /**
     * Encrypt a public key using password-derived AES key
     */
    public static String encryptPublicKey(PublicKey publicKey, String password, byte[] salt) throws Exception {
        SecretKey aesKey = deriveKey(password, salt);
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.ENCRYPT_MODE, aesKey);
        byte[] encrypted = cipher.doFinal(publicKey.getEncoded());
        return Base64.getEncoder().encodeToString(encrypted);
    }

    /**
     * Decrypt a public key using password-derived AES key
     */
    public static PublicKey decryptPublicKey(String encryptedKey, String password, byte[] salt) throws Exception {
        SecretKey aesKey = deriveKey(password, salt);
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.DECRYPT_MODE, aesKey);
        byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedKey));
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decrypted);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePublic(keySpec);
    }

    /**
     * Generate a new RSA key pair
     */
    public static KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    /**
     * Hash a password with a random salt for storage (optional utility)
     */
    public static String hashPassword(String password, byte[] salt) throws Exception {
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 65536, 256);
        byte[] hashed = factory.generateSecret(spec).getEncoded();
        return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hashed);
    }
}
