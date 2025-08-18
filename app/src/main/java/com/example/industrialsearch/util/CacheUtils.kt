package com.example.industrialsearch.util

object CacheUtils {
    private const val CACHE_EXPIRY_HOURS = 24L

    fun isCacheExpired(timestamp: Long): Boolean {
        val currentTime = System.currentTimeMillis()
        val expiryTime = timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
        return currentTime > expiryTime
    }

    fun getCacheExpiryTime(): Long {
        return System.currentTimeMillis() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
    }
}

