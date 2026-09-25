<?php

namespace App\Events;

use App\Models\ItemMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMatchFound implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $payload;

    public function __construct(
        public readonly ItemMatch $match,
        public readonly int $targetUserId
    ) {
        $this->payload = [
            'match_id'    => $match->id,
            'score'       => $match->score,
            'item_lost'   => [
                'id'    => $match->itemLost?->id,
                'title' => $match->itemLost?->title,
            ],
            'item_found'  => [
                'id'    => $match->itemFound?->id,
                'title' => $match->itemFound?->title,
            ],
        ];
    }

    /**
     * Broadcast on the private channel of the target user.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->targetUserId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'new-match';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
