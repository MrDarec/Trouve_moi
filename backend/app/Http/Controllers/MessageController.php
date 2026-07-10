<?php

namespace App\Http\Controllers;

use App\Models\ItemMatch;
use App\Models\Message;
use App\Models\Report;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    public function getMessages(Request $request, $matchId)
    {
        $userId = $request->user()->id;
        $match = ItemMatch::find($matchId);

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        if ($match->user_lost_id !== $userId && $match->user_found_id !== $userId) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $messages = Message::where('match_id', $matchId)
            ->oldest()
            ->get();

        // Mark incoming messages as read
        Message::where('match_id', $matchId)
            ->where('receiver_id', $userId)
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'messages' => $messages
        ]);
    }

    public function sendMessage(Request $request, $matchId)
    {
        $userId = $request->user()->id;
        $match = ItemMatch::find($matchId);

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        if ($match->user_lost_id !== $userId && $match->user_found_id !== $userId) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        if (!$match->chat_enabled) {
            return response()->json(['message' => 'Le chat est verrouillé tant que le match n\'est pas accepté par les deux parties.'], 400);
        }

        $request->validate([
            'content' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|max:5120', // 5MB limit
        ]);

        if (!$request->filled('content') && !$request->hasFile('photo')) {
            return response()->json(['message' => 'Le message ne peut pas être vide.'], 400);
        }

        $receiverId = ($match->user_lost_id === $userId) ? $match->user_found_id : $match->user_lost_id;

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photo = $request->file('photo');
            $filename = time() . '_' . Str::random(10) . '.' . $photo->getClientOriginalExtension();
            $photo->move(public_path('uploads'), $filename);
            $photoPath = 'uploads/' . $filename;
        }

        $message = Message::create([
            'match_id' => $matchId,
            'sender_id' => $userId,
            'receiver_id' => $receiverId,
            'content' => $request->content,
            'photo' => $photoPath,
            'type' => $photoPath ? 'image' : 'text',
            'read' => false
        ]);

        // Generate notification
        Notification::create([
            'user_id' => $receiverId,
            'type' => 'new_message',
            'title' => "✉️ Nouveau message de {$request->user()->name}",
            'message' => $request->content ?? "Vous avez reçu une image.",
            'data' => ['match_id' => $matchId, 'message_id' => $message->id],
        ]);

        return response()->json([
            'success' => true,
            'message' => $message
        ], 201);
    }

    public function reportMessage(Request $request, $messageId)
    {
        $request->validate([
            'reason' => 'required|in:spam,fake,inappropriate,harassment,fraud,other',
            'description' => 'nullable|string|max:500',
        ]);

        $message = Message::find($messageId);
        if (!$message) {
            return response()->json(['message' => 'Message introuvable.'], 404);
        }

        $report = Report::create([
            'reporter_id' => $request->user()->id,
            'reported_user_id' => $message->sender_id,
            'reported_message_id' => $messageId,
            'reason' => $request->reason,
            'description' => $request->description,
            'status' => 'pending'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Signalement envoyé aux modérateurs.',
            'report' => $report
        ], 201);
    }
}
