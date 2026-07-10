<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemMatch extends Model
{
    use HasFactory;

    protected $table = 'matches';

    protected $fillable = [
        'item_lost_id',
        'item_found_id',
        'user_lost_id',
        'user_found_id',
        'score',
        'score_details',
        'status',
        'accepted_by_lost',
        'accepted_by_found',
        'rejected_by_id',
        'chat_enabled',
        'restitution_confirmed_by_lost',
        'restitution_confirmed_by_found',
    ];

    protected $casts = [
        'score' => 'integer',
        'score_details' => 'array',
        'accepted_by_lost' => 'boolean',
        'accepted_by_found' => 'boolean',
        'chat_enabled' => 'boolean',
        'restitution_confirmed_by_lost' => 'boolean',
        'restitution_confirmed_by_found' => 'boolean',
    ];

    public function itemLost()
    {
        return $this->belongsTo(Item::class, 'item_lost_id');
    }

    public function itemFound()
    {
        return $this->belongsTo(Item::class, 'item_found_id');
    }

    public function userLost()
    {
        return $this->belongsTo(User::class, 'user_lost_id');
    }

    public function userFound()
    {
        return $this->belongsTo(User::class, 'user_found_id');
    }

    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
