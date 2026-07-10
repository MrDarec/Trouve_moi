<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// ===================== AUTH ROUTES (PUBLIC) =====================
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOTP']);
Route::post('/auth/resend-otp', [AuthController::class, 'resendOTP']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::put('/auth/reset-password/{token}', [AuthController::class, 'resetPassword']);

// ===================== ITEMS ROUTES (PUBLIC) =====================
Route::get('/items', [ItemController::class, 'getItems']);
Route::get('/items/map', [ItemController::class, 'getMapItems']);

// ===================== PROTECTED ROUTES (SANCTUM) =====================
Route::middleware('auth:sanctum')->group(function () {
    // Auth Protected
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'getMe']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);

    // Items Protected
    Route::get('/items/my-items', [ItemController::class, 'getMyItems']);
    Route::post('/items', [ItemController::class, 'createItem']);
    Route::put('/items/{id}', [ItemController::class, 'updateItem']);
    Route::delete('/items/{id}', [ItemController::class, 'deleteItem']);

    // Matches
    Route::get('/matches', [MatchController::class, 'getMyMatches']);
    Route::get('/matches/{id}', [MatchController::class, 'getMatch']);
    Route::put('/matches/{id}/accept', [MatchController::class, 'acceptMatch']);
    Route::put('/matches/{id}/reject', [MatchController::class, 'rejectMatch']);
    Route::put('/matches/{id}/confirm-restitution', [MatchController::class, 'confirmRestitution']);

    // Messages
    Route::get('/messages/{matchId}', [MessageController::class, 'getMessages']);
    Route::post('/messages/{matchId}', [MessageController::class, 'sendMessage']);
    Route::post('/messages/report/{messageId}', [MessageController::class, 'reportMessage']);

    // User Profile & History
    Route::get('/users/history', [UserController::class, 'getUserHistory']);
    Route::put('/users/profile', [UserController::class, 'updateProfile']);
    Route::get('/users/{id}', [UserController::class, 'getUserProfile']);
    Route::post('/users/{id}/report', [UserController::class, 'reportUser']);

    // Notifications
    Route::get('/notifications', [UserController::class, 'getNotifications']);
    Route::put('/notifications/read-all', [UserController::class, 'markAllAsRead']);
    Route::put('/notifications/{id}/read', [UserController::class, 'markAsRead']);
    Route::delete('/notifications/{id}', [UserController::class, 'deleteNotification']);

    // Admin Dashboard & Moderations
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'getDashboard']);
        Route::get('/users', [\App\Http\Controllers\AdminController::class, 'getUsers']);
        Route::patch('/users/{id}/suspend', [\App\Http\Controllers\AdminController::class, 'toggleSuspend']);
        Route::patch('/users/{id}/verify', [\App\Http\Controllers\AdminController::class, 'verifyIdentity']);
        Route::get('/items/pending', [\App\Http\Controllers\AdminController::class, 'getPendingItems']);
        Route::patch('/items/{id}/moderate', [\App\Http\Controllers\AdminController::class, 'moderateItem']);
        Route::get('/items', [\App\Http\Controllers\AdminController::class, 'getAllItems']);
        Route::delete('/items/{id}', [\App\Http\Controllers\AdminController::class, 'deleteItem']);
        Route::get('/reports', [\App\Http\Controllers\AdminController::class, 'getReports']);
        Route::patch('/reports/{id}/resolve', [\App\Http\Controllers\AdminController::class, 'resolveReport']);
    });
});

// Item detail endpoint (optionalAuth fallback is standard get here)
Route::get('/items/{id}', [ItemController::class, 'getItem']);
