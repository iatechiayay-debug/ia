package com.example.industrialsearch.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.industrialsearch.data.repo.ProductRepository
import com.example.industrialsearch.data.model.Product
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class ProductSearchViewModel @Inject constructor(
    private val repository: ProductRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    private val _bookmarkedProducts = MutableStateFlow<List<Product>>(emptyList())
    val bookmarkedProducts: StateFlow<List<Product>> = _bookmarkedProducts.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _searchHistory = MutableStateFlow<List<String>>(emptyList())
    val searchHistory: StateFlow<List<String>> = _searchHistory.asStateFlow()

    init {
        loadSearchHistory()
        loadBookmarkedProducts()
        viewModelScope.launch { repository.clearExpiredCache() }
    }

    fun searchProducts(query: String) {
        _searchQuery.value = query
        if (query.isBlank()) {
            _products.value = emptyList()
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            repository.searchProducts(query).collect { results ->
                _products.value = results
                _isLoading.value = false
            }
        }
    }

    fun toggleBookmark(productId: String) {
        viewModelScope.launch {
            repository.toggleBookmark(productId)
            loadBookmarkedProducts()
            _products.value = _products.value.map { product ->
                if (product.id == productId) product.copy(isBookmarked = !product.isBookmarked) else product
            }
        }
    }

    fun fetchProduct(productId: String, onLoaded: (Product?) -> Unit) {
        viewModelScope.launch {
            val product = repository.getProductDetails(productId)
            onLoaded(product)
        }
    }

    private fun loadBookmarkedProducts() {
        viewModelScope.launch { _bookmarkedProducts.value = repository.getBookmarkedProducts() }
    }

    private fun loadSearchHistory() {
        viewModelScope.launch { _searchHistory.value = repository.getSearchHistory() }
    }
}

