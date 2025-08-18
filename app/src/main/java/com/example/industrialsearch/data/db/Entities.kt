package com.example.industrialsearch.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val productNumber: String,
    val manufacturer: String,
    val description: String?,
    val priceValue: Double?,
    val priceCurrency: String?,
    val priceUnit: String?,
    val isPriceEstimate: Boolean = false,
    val datasheetUrl: String?,
    val imageUrl: String?,
    val inStock: Boolean,
    val quantity: Int?,
    val leadTime: String?,
    val lastUpdated: Long,
    val technicalSupportUrl: String?,
    val technicalSupportPhone: String?,
    val technicalSupportEmail: String?,
    val technicalSupportChat: String?,
    val services: String?,
    val specifications: String?,
    val category: String?,
    val isBookmarked: Boolean = false,
    val cacheExpiry: Long = System.currentTimeMillis() + 24 * 60 * 60 * 1000
)

@Entity(tableName = "search_history")
data class SearchHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val query: String,
    val timestamp: Long = System.currentTimeMillis()
)

