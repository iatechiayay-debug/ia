package com.example.industrialsearch.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.industrialsearch.data.model.Product

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    productId: String,
    onBackClick: () -> Unit,
    viewModel: ProductSearchViewModel = hiltViewModel()
) {
    var product by remember { mutableStateOf<Product?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(productId) {
        viewModel.fetchProduct(productId) {
            product = it
            isLoading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowBack, contentDescription = null) }
            Text(text = "Product Details", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            product?.let { prod ->
                IconButton(onClick = { viewModel.toggleBookmark(prod.id) }) {
                    Icon(imageVector = if (prod.isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder, contentDescription = null, tint = if (prod.isBookmarked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        when {
            isLoading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            product == null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Product not found") }
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    Card { Column(modifier = Modifier.padding(16.dp)) {
                        Row {
                            AsyncImage(model = product!!.imageUrl ?: "", contentDescription = null, modifier = Modifier.size(120.dp).background(MaterialTheme.colorScheme.surfaceVariant))
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(text = product!!.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Text(text = "Part #: ${product!!.productNumber}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(text = product!!.manufacturer.displayName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                            }
                        }
                    } }
                }
                item {
                    Card { Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Pricing & Availability", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                        product!!.price?.let { price ->
                            Text(text = "${price.currency} ${String.format("%.2f", price.value)}${price.unit?.let { " / $it" } ?: ""}", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
                            if (price.isEstimate) Text(text = "* Estimated price", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } ?: Text(text = "Contact for pricing", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = if (product!!.availability.inStock) Icons.Default.CheckCircle else Icons.Default.Cancel, contentDescription = null, tint = if (product!!.availability.inStock) Color.Green else Color.Red)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = if (product!!.availability.inStock) "In Stock" else "Out of Stock", style = MaterialTheme.typography.bodyMedium, color = if (product!!.availability.inStock) Color.Green else Color.Red, fontWeight = FontWeight.Medium)
                        }
                        product!!.availability.quantity?.let { qty -> Text(text = "Quantity available: $qty", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        product!!.availability.leadTime?.let { lead -> Text(text = "Lead time: $lead", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    } }
                }
                product!!.description?.let { description ->
                    item { Card { Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Description", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = description, style = MaterialTheme.typography.bodyMedium)
                    } } }
                }
            }
        }
    }
}

