<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Services\MatchingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    protected $matchingService;

    public function __construct(MatchingService $matchingService)
    {
        $this->matchingService = $matchingService;
    }

    public function getItems(Request $request)
    {
        $query = Item::with('user:id,name,reliability_score,avatar')
            ->where('status', 'active')
            ->where('moderation_status', 'approved');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $limit = $request->input('limit', 12);
        $items = $query->latest()->paginate($limit);

        return response()->json([
            'success' => true,
            'items' => $items->items(),
            'pagination' => [
                'total' => $items->total(),
                'count' => $items->count(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'total_pages' => $items->lastPage()
            ]
        ]);
    }

    public function getMapItems(Request $request)
    {
        $items = Item::where('status', 'active')
            ->where('moderation_status', 'approved')
            ->get(['id', 'title', 'type', 'category', 'city', 'latitude', 'longitude']);

        $features = $items->map(function ($item) {
            return [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(double)$item->longitude, (double)$item->latitude]
                ],
                'properties' => [
                    '_id' => $item->id,
                    'title' => $item->title,
                    'type' => $item->type,
                    'category' => $item->category,
                    'city' => $item->city
                ]
            ];
        });

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features
        ]);
    }

    public function getMyItems(Request $request)
    {
        $items = Item::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'items' => $items
        ]);
    }

    public function getItem($id)
    {
        $item = Item::with('user:id,name,reliability_score,avatar,created_at')->find($id);

        if (!$item) {
            return response()->json(['message' => 'Signalement introuvable.'], 404);
        }

        // Rename coordinate mapping to match MongoDB coordinates schema [lng, lat]
        $formattedItem = $item->toArray();
        $formattedItem['userId'] = $item->user; // mapping for frontend owner populate
        $formattedItem['location'] = [
            'coordinates' => [(double)$item->longitude, (double)$item->latitude],
            'address' => $item->address
        ];

        return response()->json([
            'success' => true,
            'item' => $formattedItem
        ]);
    }

    public function createItem(Request $request)
    {
        $request->validate([
            'type' => 'required|in:lost,found',
            'category' => 'required|string',
            'title' => 'required|string|min:5|max:150',
            'description' => 'required|string|max:2000',
            'date' => 'required|date',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'city' => 'nullable|string',
            'reward' => 'nullable|numeric',
        ]);

        $photos = [];
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $filename = time() . '_' . Str::random(10) . '.' . $photo->getClientOriginalExtension();
                $photo->move(public_path('uploads'), $filename);
                $photos[] = 'uploads/' . $filename;
            }
        }

        $item = Item::create([
            'type' => $request->type,
            'category' => $request->category,
            'title' => $request->title,
            'description' => $request->description,
            'date' => $request->date,
            'address' => $request->address ?? $request->city ?? 'Adresse non précisée',
            'city' => $request->city,
            'latitude' => $request->lat,
            'longitude' => $request->lng,
            'reward_offered' => $request->filled('reward') && $request->reward > 0,
            'reward_amount' => $request->reward ?? 0,
            'reward_currency' => 'XOF',
            'status' => 'active',
            'is_moderated' => false,
            'moderation_status' => 'approved', // Auto-approving for easy testing
            'user_id' => $request->user()->id,
            'photos' => $photos,
        ]);

        // Trigger matching service
        $this->matchingService->findMatches($item);

        return response()->json([
            'success' => true,
            'message' => 'Signalement créé avec succès !',
            'item' => $item
        ], 201);
    }

    public function updateItem(Request $request, $id)
    {
        $item = Item::find($id);

        if (!$item) {
            return response()->json(['message' => 'Signalement introuvable.'], 404);
        }

        if ($item->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $item->update($request->only([
            'title', 'description', 'category', 'status', 'city', 'reward_amount'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Signalement mis à jour.',
            'item' => $item
        ]);
    }

    public function deleteItem(Request $request, $id)
    {
        $item = Item::find($id);

        if (!$item) {
            return response()->json(['message' => 'Signalement introuvable.'], 404);
        }

        if ($item->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Signalement supprimé.'
        ]);
    }
}
