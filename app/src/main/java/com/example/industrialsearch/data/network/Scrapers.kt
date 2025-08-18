package com.example.industrialsearch.data.network

import android.util.Log
import com.example.industrialsearch.data.model.Manufacturer
import com.example.industrialsearch.data.model.Price
import com.example.industrialsearch.data.model.Product
import com.example.industrialsearch.data.model.ProductAvailability
import com.example.industrialsearch.data.model.Service
import com.example.industrialsearch.data.model.ServiceType
import com.example.industrialsearch.data.model.TechnicalSupport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jsoup.Jsoup

class WagoApiService : ManufacturerApiService {
    override suspend fun searchProducts(query: String): List<Product> = try {
        WagoWebScraper.searchProducts(query)
    } catch (e: Exception) {
        Log.e("WagoApiService", "Error searching products", e)
        emptyList()
    }

    override suspend fun getProductDetails(productId: String): Product? = try {
        WagoWebScraper.getProductDetails(productId)
    } catch (e: Exception) {
        Log.e("WagoApiService", "Error getting product details", e)
        null
    }
}

class PhoenixContactApiService : ManufacturerApiService {
    override suspend fun searchProducts(query: String): List<Product> = try {
        PhoenixContactWebScraper.searchProducts(query)
    } catch (e: Exception) {
        Log.e("PhoenixContactApiService", "Error searching products", e)
        emptyList()
    }

    override suspend fun getProductDetails(productId: String): Product? = try {
        PhoenixContactWebScraper.getProductDetails(productId)
    } catch (e: Exception) {
        Log.e("PhoenixContactApiService", "Error getting product details", e)
        null
    }
}

class AllenBradleyApiService : ManufacturerApiService {
    override suspend fun searchProducts(query: String): List<Product> = try {
        AllenBradleyWebScraper.searchProducts(query)
    } catch (e: Exception) {
        Log.e("AllenBradleyApiService", "Error searching products", e)
        emptyList()
    }

    override suspend fun getProductDetails(productId: String): Product? = try {
        AllenBradleyWebScraper.getProductDetails(productId)
    } catch (e: Exception) {
        Log.e("AllenBradleyApiService", "Error getting product details", e)
        null
    }
}

class InduSolApiService : ManufacturerApiService {
    override suspend fun searchProducts(query: String): List<Product> = try {
        InduSolWebScraper.searchProducts(query)
    } catch (e: Exception) {
        Log.e("InduSolApiService", "Error searching products", e)
        emptyList()
    }

    override suspend fun getProductDetails(productId: String): Product? = try {
        InduSolWebScraper.getProductDetails(productId)
    } catch (e: Exception) {
        Log.e("InduSolApiService", "Error getting product details", e)
        null
    }
}

class ABBApiService : ManufacturerApiService {
    override suspend fun searchProducts(query: String): List<Product> = try {
        ABBWebScraper.searchProducts(query)
    } catch (e: Exception) {
        Log.e("ABBApiService", "Error searching products", e)
        emptyList()
    }

    override suspend fun getProductDetails(productId: String): Product? = try {
        ABBWebScraper.getProductDetails(productId)
    } catch (e: Exception) {
        Log.e("ABBApiService", "Error getting product details", e)
        null
    }
}

object WagoWebScraper {
    private const val BASE_URL = "https://www.wago.com"

    suspend fun searchProducts(query: String): List<Product> = withContext(Dispatchers.IO) {
        try {
            val doc = Jsoup.connect("$BASE_URL/global/search?text=$query")
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(10000)
                .get()

            val products = mutableListOf<Product>()
            doc.select(".product-item").forEach { element ->
                val name = element.select(".product-title").text()
                val productNumber = element.select(".product-number").text()
                val description = element.select(".product-description").text()
                val imageUrl = element.select("img").attr("src")
                val productUrl = element.select("a").attr("href")
                if (name.isNotEmpty() && productNumber.isNotEmpty()) {
                    products.add(
                        Product(
                            id = "wago_" + productNumber.replace(" ", "_"),
                            name = name,
                            productNumber = productNumber,
                            manufacturer = Manufacturer.WAGO,
                            description = description.ifEmpty { null },
                            imageUrl = if (imageUrl.startsWith("http")) imageUrl else "$BASE_URL$imageUrl",
                            availability = ProductAvailability(inStock = true),
                            price = null,
                            datasheetUrl = if (productUrl.isNotEmpty()) "$BASE_URL$productUrl" else null,
                            technicalSupport = TechnicalSupport(contactUrl = "$BASE_URL/global/support")
                        )
                    )
                }
            }
            products
        } catch (e: Exception) {
            Log.e("WagoWebScraper", "Error scraping products", e)
            emptyList()
        }
    }

    suspend fun getProductDetails(productId: String): Product? = withContext(Dispatchers.IO) { null }
}

object PhoenixContactWebScraper {
    private const val BASE_URL = "https://www.phoenixcontact.com"

    suspend fun searchProducts(query: String): List<Product> = withContext(Dispatchers.IO) {
        try {
            val doc = Jsoup.connect("$BASE_URL/online_catalog/search?search=$query")
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(10000)
                .get()

            val products = mutableListOf<Product>()
            doc.select(".product-tile").forEach { element ->
                val name = element.select(".product-name").text()
                val productNumber = element.select(".order-number").text()
                val description = element.select(".product-description").text()
                val imageUrl = element.select("img").attr("src")
                val priceText = element.select(".price").text()
                val availabilityText = element.select(".availability").text()
                if (name.isNotEmpty() && productNumber.isNotEmpty()) {
                    val price = extractPrice(priceText)
                    val availability = ProductAvailability(
                        inStock = availabilityText.contains("available", true) || availabilityText.contains("in stock", true),
                        leadTime = availabilityText.takeIf { it.contains("weeks", true) }
                    )
                    products.add(
                        Product(
                            id = "phoenix_" + productNumber.replace(" ", "_"),
                            name = name,
                            productNumber = productNumber,
                            manufacturer = Manufacturer.PHOENIX_CONTACT,
                            description = description.ifEmpty { null },
                            price = price,
                            imageUrl = if (imageUrl.startsWith("http")) imageUrl else "$BASE_URL$imageUrl",
                            availability = availability,
                            technicalSupport = TechnicalSupport(
                                contactUrl = "$BASE_URL/support",
                                phoneNumber = "+1-717-944-1300"
                            ),
                            services = listOf(
                                Service(ServiceType.INSTALLATION, "Installation Service", "Professional installation", null),
                                Service(ServiceType.TRAINING, "Product Training", "Technical training programs", null)
                            )
                        )
                    )
                }
            }
            products
        } catch (e: Exception) {
            Log.e("PhoenixContactWebScraper", "Error scraping products", e)
            emptyList()
        }
    }

    suspend fun getProductDetails(productId: String): Product? = withContext(Dispatchers.IO) { null }

    private fun extractPrice(priceText: String): Price? = try {
        val regex = Regex("""(\$|€|£)?\s*(\d+\.?\d*)\s*(\w+)?""")
        val match = regex.find(priceText)
        match?.let {
            val currency = it.groups[1]?.value ?: "USD"
            val value = it.groups[2]?.value?.toDoubleOrNull() ?: return null
            val unit = it.groups[3]?.value
            Price(value, currency, unit)
        }
    } catch (_: Exception) { null }
}

object AllenBradleyWebScraper {
    private const val BASE_URL = "https://www.rockwellautomation.com"

    suspend fun searchProducts(query: String): List<Product> = withContext(Dispatchers.IO) {
        try {
            val doc = Jsoup.connect("$BASE_URL/en-us/products/search?q=$query")
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(15000)
                .get()
            val products = mutableListOf<Product>()
            doc.select(".product-card").forEach { element ->
                val name = element.select(".product-title").text()
                val productNumber = element.select(".catalog-number").text()
                val description = element.select(".product-summary").text()
                val imageUrl = element.select("img").attr("src")
                val datasheetLink = element.select("a[href*='datasheet']").attr("href")
                if (name.isNotEmpty() && productNumber.isNotEmpty()) {
                    products.add(
                        Product(
                            id = "ab_" + productNumber.replace(" ", "_"),
                            name = name,
                            productNumber = productNumber,
                            manufacturer = Manufacturer.ALLEN_BRADLEY,
                            description = description.ifEmpty { null },
                            imageUrl = if (imageUrl.startsWith("http")) imageUrl else "$BASE_URL$imageUrl",
                            availability = ProductAvailability(inStock = true),
                            datasheetUrl = if (datasheetLink.startsWith("http")) datasheetLink else "$BASE_URL$datasheetLink",
                            technicalSupport = TechnicalSupport(
                                contactUrl = "$BASE_URL/en-us/support",
                                phoneNumber = "1-440-646-3434"
                            ),
                            services = listOf(
                                Service(ServiceType.INSTALLATION, "Startup Services", "Professional startup and commissioning", null),
                                Service(ServiceType.MAINTENANCE, "Maintenance Services", "Preventive and predictive maintenance", null),
                                Service(ServiceType.TRAINING, "Training Services", "Comprehensive training programs", null),
                                Service(ServiceType.REPAIR, "Repair Services", "Factory repair services", null)
                            )
                        )
                    )
                }
            }
            products
        } catch (e: Exception) {
            Log.e("AllenBradleyWebScraper", "Error scraping products", e)
            emptyList()
        }
    }

    suspend fun getProductDetails(productId: String): Product? = withContext(Dispatchers.IO) { null }
}

object InduSolWebScraper {
    private const val BASE_URL = "https://www.indusol.com"

    suspend fun searchProducts(query: String): List<Product> = withContext(Dispatchers.IO) {
        try {
            val doc = Jsoup.connect("$BASE_URL/products?search=$query")
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(10000)
                .get()
            val products = mutableListOf<Product>()
            doc.select(".product-item, .product-box").forEach { element ->
                val name = element.select("h3, .product-name, .title").text()
                val productNumber = element.select(".part-number, .product-code").text()
                val description = element.select("p, .description").text()
                val imageUrl = element.select("img").attr("src")
                if (name.isNotEmpty()) {
                    val finalProductNumber = if (productNumber.isNotEmpty()) productNumber else name
                    products.add(
                        Product(
                            id = "indusol_" + finalProductNumber.replace(" ", "_").take(20),
                            name = name,
                            productNumber = finalProductNumber,
                            manufacturer = Manufacturer.INDUSOL,
                            description = description.ifEmpty { null },
                            imageUrl = if (imageUrl.startsWith("http")) imageUrl else "$BASE_URL$imageUrl",
                            availability = ProductAvailability(inStock = true),
                            technicalSupport = TechnicalSupport(
                                contactUrl = "$BASE_URL/support",
                                email = "support@indusol.com"
                            ),
                            services = listOf(
                                Service(ServiceType.CONSULTING, "Network Consulting", "Industrial network consulting services", null),
                                Service(ServiceType.TRAINING, "Network Training", "Industrial Ethernet training", null)
                            )
                        )
                    )
                }
            }
            products
        } catch (e: Exception) {
            Log.e("InduSolWebScraper", "Error scraping products", e)
            emptyList()
        }
    }

    suspend fun getProductDetails(productId: String): Product? = withContext(Dispatchers.IO) { null }
}

object ABBWebScraper {
    private const val BASE_URL = "https://new.abb.com"

    suspend fun searchProducts(query: String): List<Product> = withContext(Dispatchers.IO) {
        try {
            val doc = Jsoup.connect("$BASE_URL/products/search?q=$query")
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(15000)
                .get()
            val products = mutableListOf<Product>()
            doc.select(".product-tile, .search-result-item").forEach { element ->
                val name = element.select(".product-name, h3").text()
                val productNumber = element.select(".type-designation, .product-code").text()
                val description = element.select(".product-description, .summary").text()
                val imageUrl = element.select("img").attr("src")
                val priceText = element.select(".price, .cost").text()
                if (name.isNotEmpty()) {
                    val finalProductNumber = if (productNumber.isNotEmpty()) productNumber else name.split(" ").take(2).joinToString(" ")
                    products.add(
                        Product(
                            id = "abb_" + finalProductNumber.replace(" ", "_").take(20),
                            name = name,
                            productNumber = finalProductNumber,
                            manufacturer = Manufacturer.ABB,
                            description = description.ifEmpty { null },
                            price = extractPrice(priceText),
                            imageUrl = if (imageUrl.startsWith("http")) imageUrl else "$BASE_URL$imageUrl",
                            availability = ProductAvailability(inStock = true),
                            technicalSupport = TechnicalSupport(
                                contactUrl = "$BASE_URL/contact",
                                phoneNumber = "1-800-HELP-ABB"
                            ),
                            services = listOf(
                                Service(ServiceType.INSTALLATION, "Installation & Commissioning", "Professional installation services", null),
                                Service(ServiceType.MAINTENANCE, "Service & Maintenance", "Comprehensive maintenance solutions", null),
                                Service(ServiceType.TRAINING, "Training & Education", "Technical training programs", null),
                                Service(ServiceType.CONSULTING, "Consulting Services", "Expert consulting and optimization", null)
                            )
                        )
                    )
                }
            }
            products
        } catch (e: Exception) {
            Log.e("ABBWebScraper", "Error scraping products", e)
            emptyList()
        }
    }

    suspend fun getProductDetails(productId: String): Product? = withContext(Dispatchers.IO) { null }

    private fun extractPrice(priceText: String): Price? = try {
        val regex = Regex("""(\$|€|£)?\s*(\d+,?\d*\.?\d*)\s*(\w+)?""")
        val match = regex.find(priceText)
        match?.let {
            val currency = it.groups[1]?.value ?: "USD"
            val valueStr = it.groups[2]?.value?.replace(",", "") ?: return null
            val value = valueStr.toDoubleOrNull() ?: return null
            val unit = it.groups[3]?.value
            Price(value, currency, unit)
        }
    } catch (_: Exception) { null }
}

