<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'city',
        'avatar',
        'role',
        'is_verified',
        'is_phone_verified',
        'is_identity_verified',
        'is_suspended',
        'provider',
        'provider_id',
        'reliability_score',
        'successful_restitutions',
        'otp',
        'otp_expire',
        'last_seen',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'otp',
    ];

    protected $appends = ['badge'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_verified' => 'boolean',
            'is_phone_verified' => 'boolean',
            'is_identity_verified' => 'boolean',
            'is_suspended' => 'boolean',
            'reliability_score' => 'integer',
            'successful_restitutions' => 'integer',
            'otp_expire' => 'datetime',
            'last_seen' => 'datetime',
        ];
    }

    // Virtual badge attribute
    public function getBadgeAttribute(): string
    {
        if ($this->is_identity_verified && $this->reliability_score >= 80) {
            return 'gold';
        }
        if ($this->reliability_score >= 50) {
            return 'silver';
        }
        if ($this->is_verified) {
            return 'verified';
        }
        return 'basic';
    }

    // Relations
    public function items()
    {
        return $this->hasMany(Item::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class)->orderBy('created_at', 'desc');
    }
}
