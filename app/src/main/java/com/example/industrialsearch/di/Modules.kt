package com.example.industrialsearch.di

import android.content.Context
import androidx.room.Room
import com.example.industrialsearch.data.db.AppDatabase
import com.example.industrialsearch.data.db.ProductDao
import com.example.industrialsearch.data.db.SearchHistoryDao
import com.example.industrialsearch.data.model.Manufacturer
import com.example.industrialsearch.data.network.ABBApiService
import com.example.industrialsearch.data.network.AllenBradleyApiService
import com.example.industrialsearch.data.network.ManufacturerApiService
import com.example.industrialsearch.data.network.PhoenixContactApiService
import com.example.industrialsearch.data.network.SiemensApiService
import com.example.industrialsearch.data.network.InduSolApiService
import com.example.industrialsearch.data.network.WagoApiService
// no com.squareup.okhttp (old) imports
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "industrial_products_db").build()

    @Provides
    fun provideProductDao(database: AppDatabase): ProductDao = database.productDao()

    @Provides
    fun provideSearchHistoryDao(database: AppDatabase): SearchHistoryDao = database.searchHistoryDao()
}

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides
    @Singleton
    fun provideManufacturerApiServices(okHttpClient: OkHttpClient): Map<Manufacturer, ManufacturerApiService> = mapOf(
        Manufacturer.SIEMENS to SiemensApiService(),
        Manufacturer.WAGO to WagoApiService(),
        Manufacturer.PHOENIX_CONTACT to PhoenixContactApiService(),
        Manufacturer.ALLEN_BRADLEY to AllenBradleyApiService(),
        Manufacturer.INDUSOL to InduSolApiService(),
        Manufacturer.ABB to ABBApiService()
    )
}

