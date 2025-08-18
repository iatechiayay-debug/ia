package com.example.industrialsearch.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun BookmarksScreen(
    onProductClick: (String) -> Unit,
    viewModel: ProductSearchViewModel = hiltViewModel()
) {
    val bookmarkedProducts by viewModel.bookmarkedProducts.collectAsState()
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(text = "Bookmarked Products", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))
        if (bookmarkedProducts.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.BookmarkBorder, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(text = "No bookmarked products", style = MaterialTheme.typography.headlineSmall)
                    Text(text = "Bookmark products to access them quickly", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(bookmarkedProducts) { product ->
                    ProductCard(product = product, onProductClick = { onProductClick(product.id) }, onBookmarkClick = { viewModel.toggleBookmark(product.id) })
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(isDarkMode: Boolean, onDarkModeToggle: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(text = "Settings", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(24.dp))
        Card { Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "Appearance", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text(text = "Dark Mode", style = MaterialTheme.typography.bodyLarge); Text(text = "Switch between light and dark themes", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                Switch(checked = isDarkMode, onCheckedChange = { onDarkModeToggle() })
            }
        } }
        Spacer(modifier = Modifier.height(16.dp))
        Card { Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "About", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(16.dp))
            Text(text = "Industrial Product Search v1.0.0", style = MaterialTheme.typography.bodyMedium)
            Text(text = "Search products from major industrial manufacturers", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } }
    }
}

