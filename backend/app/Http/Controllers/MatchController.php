<?php

namespace App\Http\Controllers;

use App\Models\ItemMatch;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    public function getMyMatches(Request $request)
    {
        $userId = $request->user()->id;

        $matches = ItemMatch::with(['itemLost', 'itemFound', 'userLost', 'userFound'])
            ->where('user_lost_id', $userId)
            ->orWhere('user_found_id', $userId)
            ->latest()
            ->get();

        // Format to matches structure of MongoDB
        $formatted = $matches->map(function ($match) {
            $arr = $match->toArray();
            $arr['itemLost'] = $match->itemLost;
            $arr['itemFound'] = $match->itemFound;
            $arr['userLost'] = $match->userLost;
            $arr['userFound'] = $match->userFound;
            return $arr;
        });

        return response()->json([
            'success' => true,
            'matches' => $formatted
        ]);
    }

    public function getMatch(Request $request, $id)
    {
        $userId = $request->user()->id;
        $match = ItemMatch::with(['itemLost', 'itemFound', 'userLost', 'userFound'])->find($id);

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        if ($match->user_lost_id !== $userId && $match->user_found_id !== $userId) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        return response()->json([
            'success' => true,
            'match' => $match
        ]);
    }

    public function acceptMatch(Request $request, $id)
    {
        $userId = $request->user()->id;
        $match = ItemMatch::find($id);

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        if ($match->user_lost_id !== $userId && $match->user_found_id !== $userId) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        if ($match->user_lost_id === $userId) {
            $match->accepted_by_lost = true;
        } else {
            $match->accepted_by_found = true;
        }

        if ($match->accepted_by_lost && $match->accepted_by_found) {
            $match->status = 'accepted';
            $match->chat_enabled = true;

            // Generate notification for both
            Notification::create([
                'user_id' => $match->user_lost_id,
                'type' => 'match_accepted',
                'title' => '💬 Match accepté !',
                'message' => 'Le match a été accepté par les deux parties. Le chat est maintenant débloqué.',
                'data' => ['match_id' => $match->id],
            ]);

            Notification::create([
                'user_id' => $match->user_found_id,
                'type' => 'match_accepted',
                'title' => '💬 Match accepté !',
                'message' => 'Le match a été accepté par les deux parties. Le chat est maintenant débloqué.',
                'data' => ['match_id' => $match->id],
            ]);
        }

        $match->save();

        return response()->json([
            'success' => true,
            'message' => 'Match mis à jour.',
            'match' => $match
        ]);
    }

    public function rejectMatch(Request $request, $id)
    {
        $userId = $request->user()->id;
        $match = ItemMatch::find($id);

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        if ($match->user_lost_id !== $userId && $match->user_found_id !== $userId) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $match->status = 'rejected';
        $match->rejected_by_id = $userId;
        $match->chat_enabled = false;
        $match->save();

        return response()->json([
            'success' => true,
            'message' => 'Match refusé.',
            'match' => $match
        ]);
    }

    public function confirmRestitution(Request $request, $id)
    {
        $userId = $request->user()->id;
        $match = ItemMatch::find($id);

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        if ($match->user_lost_id !== $userId && $match->user_found_id !== $userId) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        if ($match->user_lost_id === $userId) {
            $match->restitution_confirmed_by_lost = true;
        } else {
            $match->restitution_confirmed_by_found = true;
        }

        if ($match->restitution_confirmed_by_lost && $match->restitution_confirmed_by_found) {
            $match->status = 'closed';

            // Increment reliability scores
            $lostUser = User::find($match->user_lost_id);
            $foundUser = User::find($match->user_found_id);

            if ($lostUser) {
                $lostUser->increment('successful_restitutions');
                $lostUser->reliability_score = min(100, $lostUser->reliability_score + 10);
                $lostUser->save();
            }

            if ($foundUser) {
                $foundUser->increment('successful_restitutions');
                $foundUser->reliability_score = min(100, $foundUser->reliability_score + 15); // found gets more points
                $foundUser->save();
            }

            Notification::create([
                'user_id' => $match->user_lost_id,
                'type' => 'restitution_confirmed',
                'title' => '🎉 Restitution confirmée !',
                'message' => 'Merci d\'avoir utilisé Trouve Moi ! Votre score de fiabilité a été mis à jour.',
                'data' => ['match_id' => $match->id],
            ]);

            Notification::create([
                'user_id' => $match->user_found_id,
                'type' => 'restitution_confirmed',
                'title' => '🎉 Restitution confirmée !',
                'message' => 'Merci d\'avoir restitué cet objet ! Votre score de fiabilité a été mis à jour.',
                'data' => ['match_id' => $match->id],
            ]);
        } else {
            // Inform the other user
            $otherUserId = ($match->user_lost_id === $userId) ? $match->user_found_id : $match->user_lost_id;
            Notification::create([
                'user_id' => $otherUserId,
                'type' => 'restitution_request',
                'title' => '🤝 Demande de confirmation de restitution',
                'message' => 'L\'autre partie a déclaré que l\'objet a été restitué. Confirmez la restitution.',
                'data' => ['match_id' => $match->id],
            ]);
        }

        $match->save();

        return response()->json([
            'success' => true,
            'message' => 'Restitution enregistrée.',
            'match' => $match
        ]);
    }
}
