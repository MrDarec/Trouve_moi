<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Item;
use App\Models\Report;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function getUserHistory(Request $request)
    {
        $userId = $request->user()->id;

        $items = Item::where('user_id', $userId)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'items' => $items
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'nullable|string|max:100',
            'phone' => 'nullable|string',
            'city' => 'nullable|string',
            'avatar' => 'nullable|image|max:2048', // 2MB
        ]);

        if ($request->filled('name')) {
            $user->name = $request->name;
        }

        if ($request->filled('phone')) {
            $user->phone = $request->phone;
        }

        if ($request->filled('city')) {
            $user->city = $request->city;
        }

        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar');
            $filename = time() . '_' . Str::random(10) . '.' . $avatar->getClientOriginalExtension();
            $avatar->move(public_path('uploads'), $filename);
            $user->avatar = 'uploads/' . $filename;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour.',
            'user' => $user
        ]);
    }

    public function getUserProfile($id)
    {
        $user = User::select('id', 'name', 'avatar', 'reliability_score', 'successful_restitutions', 'created_at')
            ->find($id);

        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        return response()->json([
            'success' => true,
            'user' => $user
        ]);
    }

    public function reportUser(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|in:spam,fake,inappropriate,harassment,fraud,other',
            'description' => 'nullable|string|max:500',
        ]);

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $report = Report::create([
            'reporter_id' => $request->user()->id,
            'reported_user_id' => $id,
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

    public function getNotifications(Request $request)
    {
        $query = Notification::where('user_id', $request->user()->id);

        if ($request->query('unread') === 'true') {
            $query->where('read', false);
        }

        $notifications = $query->latest()->get();
        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->where('read', false)
            ->count();

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unreadCount' => $unreadCount
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Toutes les notifications ont été marquées comme lues.'
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json(['message' => 'Notification introuvable.'], 404);
        }

        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $notification->read = true;
        $notification->read_at = now();
        $notification->save();

        return response()->json([
            'success' => true,
            'notification' => $notification
        ]);
    }

    public function deleteNotification(Request $request, $id)
    {
        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json(['message' => 'Notification introuvable.'], 404);
        }

        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification supprimée.'
        ]);
    }
}
