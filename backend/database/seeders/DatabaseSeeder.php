<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Créer l'utilisateur Administrateur par défaut
        User::updateOrCreate(
            ['email' => 'admin@trouvemoi.app'],
            [
                'name' => 'Administrateur',
                'password' => Hash::make('Admin@123456'),
                'role' => 'admin',
                'is_verified' => true,
                'reliability_score' => 100,
            ]
        );
    }
}
