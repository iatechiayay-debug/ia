package com.example.industrialsearch.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

@Database(
    entities = [ProductEntity::class, SearchHistoryEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun searchHistoryDao(): SearchHistoryDao
}

class Converters {
    @TypeConverter
    fun fromString(value: String?): List<String> {
        return if (value.isNullOrEmpty()) emptyList() else Gson().fromJson(value, object : TypeToken<List<String>>() {}.type)
    }

    @TypeConverter
    fun fromListString(list: List<String>): String {
        return Gson().toJson(list)
    }
}

