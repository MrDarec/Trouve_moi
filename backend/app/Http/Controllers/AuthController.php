<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $otp = sprintf("%06d", mt_rand(1, 999999));
        $otpExpire = now()->addMinutes(10);

        $user = User::create([
            'name' => $request->name,
            'email' => strtolower($request->email),
            'password' => Hash::make($request->password),
            'otp' => $otp,
            'otp_expire' => $otpExpire,
            'is_verified' => false,
        ]);

        // Simuler l'envoi de l'email OTP dans les logs
        Log::info("✉️ [OTP] Code de vérification pour {$user->email} : {$otp}");

        return response()->json([
            'success' => true,
            'message' => 'Compte créé ! Veuillez vérifier votre email pour le code OTP.',
            'email' => $user->email,
        ], 201);
    }

    public function verifyOTP(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'otp' => 'required|string|size:6',
        ]);

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        if ($user->otp !== $request->otp || now()->gt($user->otp_expire)) {
            return response()->json(['message' => 'Code OTP invalide ou expiré.'], 400);
        }

        $user->is_verified = true;
        $user->otp = null;
        $user->otp_expire = null;
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'accessToken' => $token,
            'user' => $user,
        ]);
    }

    public function resendOTP(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $otp = sprintf("%06d", mt_rand(1, 999999));
        $user->otp = $otp;
        $user->otp_expire = now()->addMinutes(10);
        $user->save();

        Log::info("✉️ [OTP Renvoyé] Nouveau code de vérification pour {$user->email} : {$otp}");

        return response()->json([
            'success' => true,
            'message' => 'Nouveau code OTP envoyé !',
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if (!$user->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Compte non vérifié.',
                'email' => $user->email,
            ], 403);
        }

        if ($user->is_suspended) {
            return response()->json(['message' => 'Votre compte est suspendu.'], 403);
        }

        // Delete old tokens
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        $user->last_seen = now();
        $user->save();

        return response()->json([
            'success' => true,
            'accessToken' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie.',
        ]);
    }

    public function getMe(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $request->user(),
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:8',
        ]);

        $user = $request->user();

        if (!Hash::check($request->currentPassword, $user->password)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect.'], 400);
        }

        $user->password = Hash::make($request->newPassword);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe mis à jour !',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user) {
            return response()->json(['message' => 'Aucun compte avec cette adresse email.'], 404);
        }

        $token = Str::random(60);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now()
            ]
        );

        Log::info("✉️ [Reset Password] Lien de réinitialisation pour {$user->email} : http://localhost:5173/reset-password/{$token}");

        return response()->json([
            'success' => true,
            'message' => 'Email de réinitialisation envoyé dans les logs.',
        ]);
    }

    public function resetPassword(Request $request, $token)
    {
        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        // Find email by token in DB
        $records = DB::table('password_reset_tokens')->get();
        $email = null;

        foreach ($records as $record) {
            if (Hash::check($token, $record->token)) {
                $email = $record->email;
                break;
            }
        }

        if (!$email) {
            return response()->json(['message' => 'Token invalide ou expiré.'], 400);
        }

        $user = User::where('email', $email)->first();
        if ($user) {
            $user->password = Hash::make($request->password);
            $user->save();

            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Mot de passe réinitialisé !',
            ]);
        }

        return response()->json(['message' => 'Utilisateur introuvable.'], 404);
    }
}
