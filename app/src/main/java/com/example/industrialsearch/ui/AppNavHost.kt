package com.example.industrialsearch.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.industrialsearch.ui.screens.BookmarksScreen
import com.example.industrialsearch.ui.screens.ProductDetailScreen
import com.example.industrialsearch.ui.screens.ProductSearchScreen
import com.example.industrialsearch.ui.screens.SettingsScreen

@Composable
fun AppNavHost(isDarkMode: Boolean, onToggleDark: () -> Unit) {
    val navController = rememberNavController()
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    label = { Text("Search") },
                    selected = false,
                    onClick = { navController.navigate("search") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Filled.Bookmark, contentDescription = null) },
                    label = { Text("Bookmarks") },
                    selected = false,
                    onClick = { navController.navigate("bookmarks") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                    label = { Text("Settings") },
                    selected = false,
                    onClick = { navController.navigate("settings") }
                )
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = "search",
            modifier = Modifier.padding(paddingValues)
        ) {
            composable("search") {
                ProductSearchScreen(onProductClick = { productId ->
                    navController.navigate("product_detail/$productId")
                })
            }
            composable("bookmarks") {
                BookmarksScreen(onProductClick = { productId ->
                    navController.navigate("product_detail/$productId")
                })
            }
            composable("settings") {
                SettingsScreen(isDarkMode = isDarkMode, onDarkModeToggle = onToggleDark)
            }
            composable("product_detail/{productId}") { backStackEntry ->
                val productId = backStackEntry.arguments?.getString("productId") ?: ""
                ProductDetailScreen(productId = productId, onBackClick = { navController.popBackStack() })
            }
        }
    }
}

