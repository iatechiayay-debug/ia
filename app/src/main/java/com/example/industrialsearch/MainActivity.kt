package com.example.industrialsearch

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import dagger.hilt.android.AndroidEntryPoint
import com.example.industrialsearch.ui.AppNavHost
import com.example.industrialsearch.ui.AppNavHost

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            IndustrialSearchApp()
        }
    }
}

@Composable
fun IndustrialSearchApp() {
    var isDarkMode by remember { mutableStateOf(false) }
    MaterialTheme(colorScheme = if (isDarkMode) darkColorScheme() else lightColorScheme()) {
        AppNavHost(isDarkMode = isDarkMode, onToggleDark = { isDarkMode = !isDarkMode })
    }
}