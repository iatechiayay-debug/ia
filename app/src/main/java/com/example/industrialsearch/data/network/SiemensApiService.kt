package com.example.industrialsearch.data.network

import com.example.industrialsearch.data.model.Manufacturer
import com.example.industrialsearch.data.model.Price
import com.example.industrialsearch.data.model.Product
import com.example.industrialsearch.data.model.ProductAvailability
import com.example.industrialsearch.data.model.TechnicalSupport
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

class SiemensApiService : ManufacturerApiService {
    private val api: SiemensApi by lazy {
        Retrofit.Builder()
            .baseUrl(Manufacturer.SIEMENS.apiBaseUrl ?: "https://mock-api.siemens.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SiemensApi::class.java)
    }

    override suspend fun searchProducts(query: String): List<Product> {
        return try {
            val response = api.searchProducts(query)
            response.products.map { it.toProduct() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getProductDetails(productId: String): Product? {
        return try {
            val id = productId.removePrefix("siemens_")
            val response = api.getProductDetails(id)
            response.toProduct()
        } catch (e: Exception) {
            null
        }
    }
}

interface SiemensApi {
    @GET("search")
    suspend fun searchProducts(@Query("q") query: String): SiemensSearchResponse

    @GET("products/{id}")
    suspend fun getProductDetails(@Path("id") productId: String): SiemensProductResponse
}

data class SiemensSearchResponse(
    val products: List<SiemensProductResponse>,
    val totalCount: Int
)

data class SiemensProductResponse(
    val id: String,
    val name: String,
    val orderNumber: String,
    val description: String?,
    val price: SiemensPriceResponse?,
    val datasheetUrl: String?,
    val imageUrl: String?,
    val availability: SiemensAvailabilityResponse,
    val support: SiemensSupportResponse?
) {
    fun toProduct(): Product = Product(
        id = "siemens_" + id,
        name = name,
        productNumber = orderNumber,
        manufacturer = Manufacturer.SIEMENS,
        description = description,
        price = price?.let { Price(it.value, it.currency, it.unit) },
        datasheetUrl = datasheetUrl,
        imageUrl = imageUrl,
        availability = ProductAvailability(
            inStock = availability.inStock,
            quantity = availability.quantity,
            leadTime = availability.leadTime
        ),
        technicalSupport = support?.let {
            TechnicalSupport(
                contactUrl = it.contactUrl,
                phoneNumber = it.phone,
                email = it.email
            )
        }
    )
}

data class SiemensPriceResponse(
    val value: Double,
    val currency: String,
    val unit: String?
)

data class SiemensAvailabilityResponse(
    val inStock: Boolean,
    val quantity: Int?,
    val leadTime: String?
)

data class SiemensSupportResponse(
    val contactUrl: String?,
    val phone: String?,
    val email: String?
)

