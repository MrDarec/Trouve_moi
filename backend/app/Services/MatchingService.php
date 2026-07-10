<?php

namespace App\Services;

use App\Models\Item;
use App\Models\ItemMatch;
use App\Models\Notification;

class MatchingService
{
    /**
     * Haversine distance between two GPS coordinates in km
     */
    public function haversineDistance($lat1, $lng1, $lat2, $lng2): float
    {
        $earthRadius = 6371; // km

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Jaccard index similarity score for keywords
     */
    public function keywordScore(array $k1, array $k2): float
    {
        if (empty($k1) || empty($k2)) {
            return 0.0;
        }

        $set1 = array_unique(array_map('strtolower', $k1));
        $set2 = array_unique(array_map('strtolower', $k2));

        $intersection = count(array_intersect($set1, $set2));
        $union = count(array_unique(array_merge($set1, $set2)));

        return $union > 0 ? ($intersection / $union) : 0.0;
    }

    /**
     * Distance proximity score (0 to 1)
     */
    public function distanceScore(float $dist): float
    {
        if ($dist <= 0.5) return 1.0;
        if ($dist <= 5) return 0.9;
        if ($dist <= 10) return 0.7;
        if ($dist <= 20) return 0.5;
        if ($dist <= 50) return 0.2;
        return 0.0;
    }

    /**
     * Date proximity score (0 to 1)
     */
    public function dateScore($date1, $date2): float
    {
        $d1 = new \DateTime($date1);
        $d2 = new \DateTime($date2);
        $diff = abs($d1->getTimestamp() - $d2->getTimestamp()) / (60 * 60 * 24); // days

        if ($diff <= 1) return 1.0;
        if ($diff <= 3) return 0.8;
        if ($diff <= 7) return 0.6;
        if ($diff <= 14) return 0.4;
        if ($diff <= 30) return 0.2;
        return 0.05;
    }

    /**
     * Compute overall match score (0 to 100)
     */
    public function computeMatchScore(Item $lostItem, Item $foundItem): array
    {
        $weights = [
            'category' => 0.30,
            'keywords' => 0.35,
            'distance' => 0.25,
            'date' => 0.10
        ];

        $catScore = ($lostItem->category === $foundItem->category) ? 1.0 : 0.0;
        $kwScore = $this->keywordScore($lostItem->keywords ?? [], $foundItem->keywords ?? []);
        $dist = $this->haversineDistance(
            $lostItem->latitude, $lostItem->longitude,
            $foundItem->latitude, $foundItem->longitude
        );
        $distSc = $this->distanceScore($dist);
        $dateSc = $this->dateScore($lostItem->date, $foundItem->date);

        $total = ($catScore * $weights['category']) +
                 ($kwScore * $weights['keywords']) +
                 ($distSc * $weights['distance']) +
                 ($dateSc * $weights['date']);

        return [
            'total' => (int) round($total * 100),
            'details' => [
                'category' => (int) round($catScore * 100),
                'keywords' => (int) round($kwScore * 100),
                'distance' => (int) round($distSc * 100),
                'date' => (int) round($dateSc * 100)
            ],
            'distance_km' => round($dist, 1)
        ];
    }

    /**
     * Find matches for a newly created item and generate notifications
     */
    public function findMatches(Item $newItem): array
    {
        $oppositeType = ($newItem->type === 'lost') ? 'found' : 'lost';

        // Load candidates of opposite type
        $candidates = Item::where('type', $oppositeType)
            ->where('status', 'active')
            ->where('moderation_status', 'approved')
            ->where('id', '!=', $newItem->id)
            ->where('user_id', '!=', $newItem->user_id)
            ->get();

        $matches = [];
        $MIN_SCORE = 30;

        foreach ($candidates as $candidate) {
            $lostItem = ($newItem->type === 'lost') ? $newItem : $candidate;
            $foundItem = ($newItem->type === 'found') ? $newItem : $candidate;

            // Check if match already exists
            $exists = ItemMatch::where('item_lost_id', $lostItem->id)
                ->where('item_found_id', $foundItem->id)
                ->exists();

            if ($exists) {
                continue;
            }

            // Calculate distance in km
            $dist = $this->haversineDistance(
                $lostItem->latitude, $lostItem->longitude,
                $foundItem->latitude, $foundItem->longitude
            );

            // Skip if distance > 100 km
            if ($dist > 100) {
                continue;
            }

            $score = $this->computeMatchScore($lostItem, $foundItem);

            if ($score['total'] >= $MIN_SCORE) {
                $match = ItemMatch::create([
                    'item_lost_id' => $lostItem->id,
                    'item_found_id' => $foundItem->id,
                    'user_lost_id' => $lostItem->user_id,
                    'user_found_id' => $foundItem->user_id,
                    'score' => $score['total'],
                    'score_details' => $score['details'],
                ]);

                $matches[] = $match;

                // Create in-app notifications
                Notification::create([
                    'user_id' => $lostItem->user_id,
                    'type' => 'new_match',
                    'title' => '🎯 Nouveau match trouvé !',
                    'message' => "Un objet trouvé correspond à votre signalement avec un score de {$score['total']}%.",
                    'data' => ['match_id' => $match->id, 'score' => $score['total']],
                ]);

                Notification::create([
                    'user_id' => $foundItem->user_id,
                    'type' => 'new_match',
                    'title' => '🎯 Nouveau match trouvé !',
                    'message' => "Un objet perdu correspond à votre signalement avec un score de {$score['total']}%.",
                    'data' => ['match_id' => $match->id, 'score' => $score['total']],
                ]);

                // Emit event triggers can be done here using Laravel events if broadcasting is set up
            }
        }

        return $matches;
    }
}
