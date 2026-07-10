<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Item;
use App\Models\ItemMatch;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    private function formatUser($user)
    {
        if (!$user) return null;
        return [
            '_id' => $user->id,
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'city' => $user->city,
            'avatar' => $user->avatar,
            'role' => $user->role,
            'isVerified' => (bool)$user->is_verified,
            'isPhoneVerified' => (bool)$user->is_phone_verified,
            'isIdentityVerified' => (bool)$user->is_identity_verified,
            'isSuspended' => (bool)$user->is_suspended,
            'reliabilityScore' => (int)$user->reliability_score,
            'successfulRestitutions' => (int)$user->successful_restitutions,
            'badge' => $user->badge,
            'createdAt' => $user->created_at ? $user->created_at->toIso8601String() : null,
        ];
    }

    private function formatItem($item)
    {
        if (!$item) return null;
        return [
            '_id' => $item->id,
            'id' => $item->id,
            'type' => $item->type,
            'category' => $item->category,
            'title' => $item->title,
            'description' => $item->description,
            'date' => $item->date,
            'address' => $item->address,
            'city' => $item->city,
            'latitude' => (double)$item->latitude,
            'longitude' => (double)$item->longitude,
            'rewardOffered' => (bool)$item->reward_offered,
            'rewardAmount' => (double)$item->reward_amount,
            'status' => $item->status,
            'isModerated' => (bool)$item->is_moderated,
            'moderationStatus' => $item->moderation_status,
            'photos' => $item->photos,
            'userId' => $this->formatUser($item->user),
            'createdAt' => $item->created_at ? $item->created_at->toIso8601String() : null,
        ];
    }

    private function formatReport($report)
    {
        if (!$report) return null;
        return [
            '_id' => $report->id,
            'id' => $report->id,
            'reason' => $report->reason,
            'description' => $report->description,
            'status' => $report->status,
            'targetType' => $report->reported_message_id ? 'message' : 'user',
            'reporterId' => $this->formatUser($report->reporter),
            'reportedUserId' => $this->formatUser($report->reportedUser),
            'createdAt' => $report->created_at ? $report->created_at->toIso8601String() : null,
        ];
    }

    public function getDashboard(Request $request)
    {
        $totalUsers = User::where('role', 'user')->count();
        $totalItems = Item::count();
        $totalMatches = ItemMatch::count();
        $totalRestitutions = ItemMatch::where('status', 'closed')->count();
        $recentReports = Report::where('status', 'pending')->count();
        $pendingItems = Item::where('moderation_status', 'pending')->count();

        $lostItems = Item::where('type', 'lost')->count();
        $foundItems = Item::where('type', 'found')->count();
        $activeItems = Item::where('status', 'active')->count();

        $restitutionRate = $totalMatches > 0 ? (int)round(($totalRestitutions / $totalMatches) * 100) : 0;

        $overview = [
            'totalUsers' => $totalUsers,
            'totalItems' => $totalItems,
            'totalMatches' => $totalMatches,
            'totalRestitutions' => $totalRestitutions,
            'restitutedItems' => $totalRestitutions,
            'recentReports' => $recentReports,
            'pendingReports' => $recentReports,
            'pendingItems' => $pendingItems,
            'lostItems' => $lostItems,
            'foundItems' => $foundItems,
            'activeItems' => $activeItems,
            'restitutionRate' => $restitutionRate,
        ];

        // Fetch daily items for last 30 days
        $dailyItems = Item::where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->selectRaw("DATE(created_at) as date, count(*) as count, sum(case when type = 'lost' then 1 else 0 end) as lost, sum(case when type = 'found' then 1 else 0 end) as found")
            ->get()
            ->keyBy('date');

        // Fetch daily matches for last 30 days
        $dailyMatches = ItemMatch::where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->selectRaw("DATE(created_at) as date, count(*) as count")
            ->get()
            ->keyBy('date');

        // Merge daily stats for the last 30 days to have continuous dates
        $dailyStats = [];
        for ($i = 29; $i >= 0; $i--) {
            $dateStr = now()->subDays($i)->format('Y-m-d');
            $itemStat = $dailyItems->get($dateStr);
            $matchStat = $dailyMatches->get($dateStr);

            $dailyStats[] = [
                '_id' => $dateStr,
                'date' => $dateStr,
                'lost' => $itemStat ? (int)$itemStat->lost : 0,
                'found' => $itemStat ? (int)$itemStat->found : 0,
                'matches' => $matchStat ? (int)$matchStat->count : 0,
            ];
        }

        // Categories stats
        $categoriesQuery = Item::groupBy('category')
            ->selectRaw("category as _id, count(*) as count")
            ->orderBy('count', 'desc')
            ->get();

        $categoriesStats = $categoriesQuery->map(function ($c) {
            return [
                '_id' => $c->_id,
                'category' => $c->_id,
                'count' => (int)$c->count
            ];
        });

        return response()->json([
            'success' => true,
            'overview' => $overview,
            'stats' => $overview,
            'dailyStats' => $dailyStats,
            'categoriesStats' => $categoriesStats
        ]);
    }

    public function getUsers(Request $request)
    {
        $query = User::query();

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->query('suspended') === 'true') {
            $query->where('is_suspended', true);
        }

        $limit = $request->input('limit', 20);
        $users = $query->latest()->paginate($limit);

        $formatted = collect($users->items())->map(function ($u) {
            return $this->formatUser($u);
        });

        return response()->json([
            'success' => true,
            'users' => $formatted,
            'pagination' => [
                'total' => $users->total(),
                'page' => $users->currentPage(),
                'limit' => $users->perPage(),
                'pages' => $users->lastPage()
            ]
        ]);
    }

    public function toggleSuspend(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Utilisateur introuvable.'], 404);
        }

        if ($user->role === 'admin') {
            return response()->json(['success' => false, 'message' => 'Impossible de suspendre un administrateur.'], 403);
        }

        $user->is_suspended = !$user->is_suspended;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => $user->is_suspended ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.',
            'isSuspended' => $user->is_suspended,
            'user' => $this->formatUser($user)
        ]);
    }

    public function verifyIdentity(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Utilisateur introuvable.'], 404);
        }

        $user->is_identity_verified = true;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Identité vérifiée.',
            'user' => $this->formatUser($user)
        ]);
    }

    public function getPendingItems(Request $request)
    {
        $limit = $request->input('limit', 20);
        $items = Item::with('user')
            ->where('moderation_status', 'pending')
            ->latest()
            ->paginate($limit);

        $formatted = collect($items->items())->map(function ($item) {
            return $this->formatItem($item);
        });

        return response()->json([
            'success' => true,
            'items' => $formatted,
            'pagination' => [
                'total' => $items->total(),
                'page' => $items->currentPage(),
                'limit' => $items->perPage()
            ]
        ]);
    }

    public function moderateItem(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:approved,rejected',
        ]);

        $item = Item::with('user')->find($id);

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Signalement introuvable.'], 404);
        }

        $action = $request->action;
        $item->moderation_status = $action;
        $item->is_moderated = true;
        $item->save();

        return response()->json([
            'success' => true,
            'message' => "Signalement " . ($action === 'approved' ? 'approuvé' : 'rejeté') . ".",
            'item' => $this->formatItem($item)
        ]);
    }

    public function getAllItems(Request $request)
    {
        $query = Item::with('user');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('moderationStatus')) {
            $query->where('moderation_status', $request->moderationStatus);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $limit = $request->input('limit', 20);
        $items = $query->latest()->paginate($limit);

        $formatted = collect($items->items())->map(function ($item) {
            return $this->formatItem($item);
        });

        return response()->json([
            'success' => true,
            'items' => $formatted,
            'pagination' => [
                'total' => $items->total(),
                'page' => $items->currentPage(),
                'limit' => $items->perPage(),
                'pages' => $items->lastPage()
            ]
        ]);
    }

    public function getReports(Request $request)
    {
        $query = Report::with(['reporter', 'reportedUser']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $limit = $request->input('limit', 20);
        $reports = $query->latest()->paginate($limit);

        $formatted = collect($reports->items())->map(function ($report) {
            return $this->formatReport($report);
        });

        return response()->json([
            'success' => true,
            'reports' => $formatted,
            'pagination' => [
                'total' => $reports->total(),
                'page' => $reports->currentPage(),
                'limit' => $reports->perPage()
            ]
        ]);
    }

    public function resolveReport(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:resolved,dismissed',
            'adminNote' => 'nullable|string'
        ]);

        $report = Report::with(['reporter', 'reportedUser'])->find($id);

        if (!$report) {
            return response()->json(['success' => false, 'message' => 'Rapport introuvable.'], 404);
        }

        $report->status = $request->action;
        $report->description = $request->adminNote ?? $report->description;
        $report->save();

        return response()->json([
            'success' => true,
            'message' => 'Rapport traité.',
            'report' => $this->formatReport($report)
        ]);
    }

    public function deleteItem(Request $request, $id)
    {
        $item = Item::find($id);

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Signalement introuvable.'], 404);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Signalement supprimé.'
        ]);
    }
}
