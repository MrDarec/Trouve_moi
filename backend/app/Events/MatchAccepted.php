<?php

namespace App\Events;

use App\Models\ItemMatch;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchAccepted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ItemMatch $match,
        public readonly int $targetUserId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->targetUserId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match-accepted';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id'    => $this->match->id,
            'chat_enabled' => $this->match->chat_enabled,
        ];
    }
}
