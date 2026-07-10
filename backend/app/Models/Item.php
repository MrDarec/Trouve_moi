<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'category',
        'title',
        'description',
        'color',
        'brand',
        'photos',
        'date',
        'address',
        'city',
        'country',
        'latitude',
        'longitude',
        'reward_offered',
        'reward_amount',
        'reward_currency',
        'reward_description',
        'status',
        'is_moderated',
        'moderation_status',
        'moderation_note',
        'user_id',
        'confirmed_by_user',
        'confirmed_by_match',
        'archived_at',
        'keywords',
    ];

    protected $casts = [
        'photos' => 'array',
        'keywords' => 'array',
        'date' => 'datetime',
        'latitude' => 'double',
        'longitude' => 'double',
        'reward_offered' => 'boolean',
        'reward_amount' => 'double',
        'is_moderated' => 'boolean',
        'confirmed_by_user' => 'boolean',
        'confirmed_by_match' => 'boolean',
        'archived_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::saving(function ($item) {
            $text = strtolower(implode(' ', [
                $item->title,
                $item->description,
                $item->color ?? '',
                $item->brand ?? ''
            ]));
            // Clean accents if possible or just standard cleaning
            $cleaned = preg_replace('/[^a-zA-Z0-9\s]/u', '', $text);
            $words = preg_split('/\s+/', $cleaned, -1, PREG_SPLIT_NO_EMPTY);
            $filtered = array_filter($words, function ($w) {
                return mb_strlen($w) > 2;
            });
            $item->keywords = array_values(array_unique($filtered));
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function matches()
    {
        return $this->hasMany(ItemMatch::class, 'item_lost_id')->orWhere('item_found_id', $this->id);
    }
}
