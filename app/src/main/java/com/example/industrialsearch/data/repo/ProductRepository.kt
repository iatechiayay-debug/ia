package com.example.industrialsearch.data.repo

import android.util.Log
import com.example.industrialsearch.data.db.ProductDao
import com.example.industrialsearch.data.db.ProductEntity
import com.example.industrialsearch.data.db.SearchHistoryDao
import com.example.industrialsearch.data.db.SearchHistoryEntity
import com.example.industrialsearch.data.model.Manufacturer
import com.example.industrialsearch.data.model.Price
import com.example.industrialsearch.data.model.Product
import com.example.industrialsearch.data.model.ProductAvailability
import com.example.industrialsearch.data.model.Service
import com.example.industrialsearch.data.model.TechnicalSupport
import com.example.industrialsearch.data.network.ManufacturerApiService
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepository @Inject constructor(
    private val productDao: ProductDao,
    private val searchHistoryDao: SearchHistoryDao,
    private val apiServices: Map<Manufacturer, @JvmSuppressWildcards ManufacturerApiService>
) {
    suspend fun searchProducts(query: String): Flow<List<Product>> = flow {
        searchHistoryDao.insertSearch(SearchHistoryEntity(query = query))
        val cachedResults = productDao.searchProducts("%$query%").map { it.toProduct() }
        emit(cachedResults)

        val allResults = mutableListOf<Product>()
        apiServices.forEach { (manufacturer, apiService) ->
            try {
                val results = apiService.searchProducts(query)
                allResults.addAll(results)
            } catch (e: Exception) {
                Log.e("ProductRepository", "Error searching ${manufacturer.displayName}", e)
            }
        }

        if (allResults.isNotEmpty()) {
            productDao.insertProducts(allResults.map { it.toEntity() })
        }
        val combined = (cachedResults + allResults).distinctBy { it.id }
        emit(combined)
    }

    suspend fun getProductDetails(productId: String): Product? {
        productDao.getProductById(productId)?.let { return it.toProduct() }
        val prefix = productId.split("_").firstOrNull()
        val manufacturer = Manufacturer.values().find { it.name.equals(prefix, ignoreCase = true) }
        return manufacturer?.let { mfg ->
            apiServices[mfg]?.getProductDetails(productId)?.also { product ->
                productDao.insertProducts(listOf(product.toEntity()))
            }
        }
    }

    suspend fun toggleBookmark(productId: String) {
        productDao.getProductById(productId)?.let { entity ->
            productDao.updateProduct(entity.copy(isBookmarked = !entity.isBookmarked))
        }
    }

    suspend fun getBookmarkedProducts(): List<Product> = productDao.getBookmarkedProducts().map { it.toProduct() }

    suspend fun getSearchHistory(): List<String> = searchHistoryDao.getRecentSearches().map { it.query }

    suspend fun clearExpiredCache() {
        productDao.clearExpiredCache()
        searchHistoryDao.cleanupOldSearches()
    }
}

private fun ProductEntity.toProduct(): Product = Product(
    id = id,
    name = name,
    productNumber = productNumber,
    manufacturer = Manufacturer.values().find { it.name == manufacturer } ?: Manufacturer.UNKNOWN,
    description = description,
    price = if (priceValue != null && priceCurrency != null) {
        Price(priceValue, priceCurrency, priceUnit, isPriceEstimate)
    } else null,
    datasheetUrl = datasheetUrl,
    imageUrl = imageUrl,
    availability = ProductAvailability(inStock, quantity, leadTime, lastUpdated),
    technicalSupport = if (
        technicalSupportUrl != null || technicalSupportPhone != null || technicalSupportEmail != null || technicalSupportChat != null
    ) {
        TechnicalSupport(technicalSupportUrl, technicalSupportPhone, technicalSupportEmail, technicalSupportChat)
    } else null,
    services = services?.let { Gson().fromJson(it, object : TypeToken<List<Service>>() {}.type) } ?: emptyList(),
    specifications = specifications?.let { Gson().fromJson(it, object : TypeToken<Map<String, String>>() {}.type) } ?: emptyMap(),
    category = category,
    isBookmarked = isBookmarked
)

private fun Product.toEntity(): ProductEntity = ProductEntity(
    id = id,
    name = name,
    productNumber = productNumber,
    manufacturer = manufacturer.name,
    description = description,
    priceValue = price?.value,
    priceCurrency = price?.currency,
    priceUnit = price?.unit,
    isPriceEstimate = price?.isEstimate ?: false,
    datasheetUrl = datasheetUrl,
    imageUrl = imageUrl,
    inStock = availability.inStock,
    quantity = availability.quantity,
    leadTime = availability.leadTime,
    lastUpdated = availability.lastUpdated,
    technicalSupportUrl = technicalSupport?.contactUrl,
    technicalSupportPhone = technicalSupport?.phoneNumber,
    technicalSupportEmail = technicalSupport?.email,
    technicalSupportChat = technicalSupport?.chatUrl,
    services = if (services.isNotEmpty()) Gson().toJson(services) else null,
    specifications = if (specifications.isNotEmpty()) Gson().toJson(specifications) else null,
    category = category,
    isBookmarked = isBookmarked
)

