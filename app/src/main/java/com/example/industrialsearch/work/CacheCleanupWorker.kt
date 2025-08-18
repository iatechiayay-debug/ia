package com.example.industrialsearch.work

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.industrialsearch.data.db.ProductDao
import com.example.industrialsearch.data.db.SearchHistoryDao
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class CacheCleanupWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val productDao: ProductDao,
    private val searchHistoryDao: SearchHistoryDao
) : CoroutineWorker(context, workerParams) {
    override suspend fun doWork(): Result {
        return try {
            productDao.clearExpiredCache()
            searchHistoryDao.cleanupOldSearches()
            Result.success()
        } catch (e: Exception) {
            Log.e("CacheCleanupWorker", "Error cleaning cache", e)
            Result.failure()
        }
    }
}

