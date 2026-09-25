<?php

use Illuminate\Support\Facades\Broadcast;

// Default Eloquent model channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Private channel for real-time match notifications
// Each user can only subscribe to their own channel
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
