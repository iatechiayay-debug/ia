package com.example.industrialsearch.data.model

enum class ServiceType {
    INSTALLATION,
    MAINTENANCE,
    TRAINING,
    CONSULTING,
    REPAIR,
    CALIBRATION
}

enum class Manufacturer(val displayName: String, val apiBaseUrl: String?) {
    SIEMENS("Siemens", "https://api.siemens.com/"),
    WAGO("WAGO", "https://api.wago.com/"),
    PHOENIX_CONTACT("Phoenix Contact", "https://api.phoenixcontact.com/"),
    ALLEN_BRADLEY("Allen-Bradley", "https://api.rockwellautomation.com/"),
    INDUSOL("InduSol", "https://api.indusol.com/"),
    ABB("ABB", "https://api.abb.com/"),
    UNKNOWN("Unknown", null)
}

data class Price(
    val value: Double,
    val currency: String,
    val unit: String? = null,
    val isEstimate: Boolean = false
)

data class ProductAvailability(
    val inStock: Boolean,
    val quantity: Int? = null,
    val leadTime: String? = null,
    val lastUpdated: Long = System.currentTimeMillis()
)

data class TechnicalSupport(
    val contactUrl: String? = null,
    val phoneNumber: String? = null,
    val email: String? = null,
    val chatUrl: String? = null
)

data class Service(
    val type: ServiceType,
    val name: String,
    val description: String?,
    val contactInfo: String?
)

data class Product(
    val id: String,
    val name: String,
    val productNumber: String,
    val manufacturer: Manufacturer,
    val description: String?,
    val price: Price?,
    val datasheetUrl: String?,
    val imageUrl: String?,
    val availability: ProductAvailability,
    val technicalSupport: TechnicalSupport?,
    val services: List<Service> = emptyList(),
    val specifications: Map<String, String> = emptyMap(),
    val category: String? = null,
    val isBookmarked: Boolean = false
)

