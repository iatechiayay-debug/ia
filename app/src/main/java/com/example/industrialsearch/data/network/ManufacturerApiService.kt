package com.example.industrialsearch.data.network

import com.example.industrialsearch.data.model.Product

interface ManufacturerApiService {
    suspend fun searchProducts(query: String): List<Product>
    suspend fun getProductDetails(productId: String): Product?
}

